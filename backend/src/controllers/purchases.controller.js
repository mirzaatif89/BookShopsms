import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { sendWhatsAppMessage } from '../services/notification.service.js';

export async function listPurchases(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.purchase_date DESC LIMIT 100`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(req, res, next) {
  try {
    const { supplier_id, items, status = 'pending' } = req.body;
    const result = await transaction(async (conn) => {
      const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_cost), 0);
      const [purchase] = await conn.query(
        'INSERT INTO purchases (supplier_id, total_amount, status) VALUES (?, ?, ?)',
        [supplier_id, total, status]
      );
      for (const item of items) {
        await conn.query('INSERT INTO purchase_items (purchase_id, book_id, quantity, unit_cost) VALUES (?, ?, ?, ?)', [
          purchase.insertId,
          item.book_id,
          item.quantity,
          item.unit_cost
        ]);
        if (status === 'received') {
          await conn.query('UPDATE books SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?', [
            item.quantity,
            item.unit_cost,
            item.book_id
          ]);
          await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "in", ?, ?)', [
            item.book_id,
            item.quantity,
            purchase.insertId
          ]);
        }
      }
      return { id: purchase.insertId, total };
    });
    if (status === 'received') {
      await sendWhatsAppMessage(process.env.ADMIN_WHATSAPP_NUMBER, `Stock received for purchase #${result.id}.`);
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function receivePurchase(req, res, next) {
  try {
    const result = await transaction(async (conn) => {
      const [purchases] = await conn.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [req.params.id]);
      const purchase = purchases[0];
      if (!purchase) throw new AppError('Purchase not found', 404);
      if (purchase.status === 'received') throw new AppError('Purchase already received', 409);
      const [items] = await conn.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [req.params.id]);
      for (const item of items) {
        await conn.query('UPDATE books SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?', [
          item.quantity,
          item.unit_cost,
          item.book_id
        ]);
        await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "in", ?, ?)', [
          item.book_id,
          item.quantity,
          req.params.id
        ]);
      }
      await conn.query('UPDATE purchases SET status = "received" WHERE id = ?', [req.params.id]);
      return { id: Number(req.params.id), status: 'received' };
    });
    await sendWhatsAppMessage(process.env.ADMIN_WHATSAPP_NUMBER, `Stock received for purchase #${req.params.id}.`);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
