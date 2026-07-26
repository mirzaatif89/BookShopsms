import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { sendWhatsAppMessage } from '../services/notification.service.js';
import { writeAudit } from '../services/audit.service.js';

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
    const {
      supplier_id,
      items,
      status = 'pending',
      discount = 0,
      tax_amount = 0,
      amount_paid = 0,
      payment_method = 'cash',
      notes = null
    } = req.body;
    const result = await transaction(async (conn) => {
      const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_cost) - Number(item.discount || 0), 0);
      const total = Math.max(subtotal - Number(discount) + Number(tax_amount), 0);
      const balance = Math.max(total - Number(amount_paid), 0);
      const paymentStatus = balance <= 0 ? 'paid' : Number(amount_paid) > 0 ? 'partial' : 'unpaid';
      const purchaseNumber = `PUR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;
      const [purchase] = await conn.query(
        `INSERT INTO purchases
          (purchase_number, supplier_id, total_amount, discount, tax_amount, amount_paid, balance, payment_method, payment_status, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseNumber, supplier_id, total, discount, tax_amount, amount_paid, balance, payment_method, paymentStatus, notes, status]
      );
      for (const item of items) {
        if (!item.product_variant_id && !item.book_id) throw new AppError('Each purchase item needs a book_id or product_variant_id', 400);
        await conn.query('INSERT INTO purchase_items (purchase_id, book_id, product_variant_id, quantity, unit_cost, discount) VALUES (?, ?, ?, ?, ?, ?)', [
          purchase.insertId,
          item.book_id || null,
          item.product_variant_id || null,
          item.quantity,
          item.unit_cost,
          item.discount || 0
        ]);
        if (status === 'received') {
          await receiveItem(conn, item, purchase.insertId, req.user.id);
        }
      }
      if (Number(amount_paid) > 0) {
        await conn.query(
          `INSERT INTO payments (purchase_id, supplier_id, direction, payment_method, amount, created_by)
           VALUES (?, ?, 'out', ?, ?, ?)`,
          [purchase.insertId, supplier_id, payment_method, amount_paid, req.user.id]
        );
      }
      if (balance > 0) {
        await conn.query('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [balance, supplier_id]);
      }
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'purchase.create',
        entityType: 'purchase',
        entityId: purchase.insertId,
        newValue: { purchase_number: purchaseNumber, total, items },
        ipAddress: req.ip
      });
      return { id: purchase.insertId, purchase_number: purchaseNumber, total };
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
        await receiveItem(conn, item, req.params.id, req.user.id);
      }
      await conn.query('UPDATE purchases SET status = "received" WHERE id = ?', [req.params.id]);
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'purchase.receive',
        entityType: 'purchase',
        entityId: req.params.id,
        newValue: { status: 'received' },
        ipAddress: req.ip
      });
      return { id: Number(req.params.id), status: 'received' };
    });
    await sendWhatsAppMessage(process.env.ADMIN_WHATSAPP_NUMBER, `Stock received for purchase #${req.params.id}.`);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function receiveItem(conn, item, purchaseId, userId) {
  if (item.product_variant_id) {
    const [[variant]] = await conn.query('SELECT stock_quantity FROM product_variants WHERE id = ? FOR UPDATE', [item.product_variant_id]);
    if (!variant) throw new AppError(`Product variant not found: ${item.product_variant_id}`, 404);
    const previous = Number(variant.stock_quantity);
    const nextQty = previous + Number(item.quantity);
    await conn.query('UPDATE product_variants SET stock_quantity = ?, purchase_price = ? WHERE id = ?', [
      nextQty,
      item.unit_cost,
      item.product_variant_id
    ]);
    await conn.query(
      `INSERT INTO stock_movements (product_variant_id, movement_type, previous_quantity, quantity_change, new_quantity, reference_type, reference_id, user_id)
       VALUES (?, 'received', ?, ?, ?, 'purchase', ?, ?)`,
      [item.product_variant_id, previous, Number(item.quantity), nextQty, purchaseId, userId]
    );
    return;
  }

  await conn.query('UPDATE books SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?', [
    item.quantity,
    item.unit_cost,
    item.book_id
  ]);
  await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "in", ?, ?)', [
    item.book_id,
    item.quantity,
    purchaseId
  ]);
}
