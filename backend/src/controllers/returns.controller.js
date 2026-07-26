import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.service.js';

export async function listReturns(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT r.*, s.receipt_number, u.name AS processed_by_name
       FROM returns r
       JOIN sales s ON s.id = r.sale_id
       LEFT JOIN users u ON u.id = r.processed_by
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createReturn(req, res, next) {
  try {
    const { sale_id, items, refund_method = 'cash', reason = null } = req.body;
    const result = await transaction(async (conn) => {
      const [[sale]] = await conn.query('SELECT * FROM sales WHERE id = ? FOR UPDATE', [sale_id]);
      if (!sale) throw new AppError('Original sale not found', 404);
      if (sale.status === 'cancelled') throw new AppError('Cannot return a cancelled sale', 409);

      const [saleItems] = await conn.query('SELECT * FROM sale_items WHERE sale_id = ?', [sale_id]);
      const byId = new Map(saleItems.map((item) => [Number(item.id), item]));
      let refundAmount = 0;

      const returnNumber = `RET-${Date.now()}`;
      const [returnResult] = await conn.query(
        `INSERT INTO returns (sale_id, return_number, refund_amount, refund_method, reason, status, processed_by)
         VALUES (?, ?, 0, ?, ?, 'approved', ?)`,
        [sale_id, returnNumber, refund_method, reason, req.user.id]
      );

      for (const item of items) {
        const original = byId.get(Number(item.sale_item_id));
        if (!original) throw new AppError(`Sale item not found: ${item.sale_item_id}`, 404);
        const quantity = Number(item.quantity);
        if (quantity < 1 || quantity > Number(original.quantity)) throw new AppError('Invalid return quantity', 400);
        const lineRefund = quantity * Number(original.unit_price);
        refundAmount += lineRefund;
        const restock = item.restock !== false;

        await conn.query(
          `INSERT INTO return_items (return_id, book_id, product_variant_id, quantity, unit_price, restock)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [returnResult.insertId, original.book_id, original.product_variant_id, quantity, original.unit_price, restock ? 1 : 0]
        );

        if (restock && original.product_variant_id) {
          const [[variant]] = await conn.query('SELECT stock_quantity FROM product_variants WHERE id = ? FOR UPDATE', [original.product_variant_id]);
          const previous = Number(variant.stock_quantity);
          const nextQty = previous + quantity;
          await conn.query('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [nextQty, original.product_variant_id]);
          await conn.query(
            `INSERT INTO stock_movements (product_variant_id, movement_type, previous_quantity, quantity_change, new_quantity, reference_type, reference_id, reason, user_id)
             VALUES (?, 'returned', ?, ?, ?, 'return', ?, ?, ?)`,
            [original.product_variant_id, previous, quantity, nextQty, returnResult.insertId, reason, req.user.id]
          );
        } else if (restock && original.book_id) {
          await conn.query('UPDATE books SET stock_quantity = stock_quantity + ? WHERE id = ?', [quantity, original.book_id]);
          await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "in", ?, ?)', [original.book_id, quantity, returnResult.insertId]);
        }
      }

      await conn.query('UPDATE returns SET refund_amount = ? WHERE id = ?', [refundAmount, returnResult.insertId]);
      await conn.query('UPDATE sales SET status = ? WHERE id = ?', ['partially_returned', sale_id]);
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'return.create',
        entityType: 'return',
        entityId: returnResult.insertId,
        newValue: { sale_id, refundAmount, items },
        ipAddress: req.ip
      });
      return { id: returnResult.insertId, return_number: returnNumber, refund_amount: refundAmount };
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
