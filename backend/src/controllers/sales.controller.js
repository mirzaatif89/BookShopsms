import PDFDocument from 'pdfkit';
import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { sendWhatsAppMessage } from '../services/notification.service.js';

export async function listSales(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT s.*, c.name AS customer_name, u.name AS cashier_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       JOIN users u ON u.id = s.cashier_id
       ORDER BY s.sale_date DESC LIMIT 100`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createSale(req, res, next) {
  try {
    const { customer_id = null, items, discount = 0, payment_method = 'cash', status = 'paid' } = req.body;
    const sale = await transaction(async (conn) => {
      const bookIds = items.map((item) => item.book_id);
      const [books] = await conn.query(`SELECT * FROM books WHERE id IN (${bookIds.map(() => '?').join(',')}) FOR UPDATE`, bookIds);
      const byId = new Map(books.map((book) => [Number(book.id), book]));
      let gross = 0;
      const normalized = items.map((item) => {
        const book = byId.get(Number(item.book_id));
        if (!book) throw new AppError(`Book not found: ${item.book_id}`, 404);
        if (book.stock_quantity < item.quantity) throw new AppError(`Insufficient stock for ${book.title}`, 409);
        const unitPrice = Number(item.unit_price ?? book.sale_price);
        const subtotal = unitPrice * Number(item.quantity);
        gross += subtotal;
        return { ...item, title: book.title, unit_price: unitPrice, subtotal };
      });
      const total = Math.max(gross - Number(discount), 0);
      const [saleResult] = await conn.query(
        'INSERT INTO sales (customer_id, cashier_id, total_amount, discount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)',
        [customer_id, req.user.id, total, discount, payment_method, status]
      );
      for (const item of normalized) {
        await conn.query('INSERT INTO sale_items (sale_id, book_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)', [
          saleResult.insertId,
          item.book_id,
          item.quantity,
          item.unit_price,
          item.subtotal
        ]);
        await conn.query('UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.book_id]);
        await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "out", ?, ?)', [
          item.book_id,
          item.quantity,
          saleResult.insertId
        ]);
      }
      if (status === 'credit' && customer_id) {
        await conn.query('UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?', [total, customer_id]);
      }
      return { id: saleResult.insertId, total_amount: total, discount, payment_method, items: normalized };
    });

    const [lowStock] = await pool.query('SELECT title, stock_quantity FROM books WHERE stock_quantity <= reorder_level');
    if (lowStock.length) {
      await sendWhatsAppMessage(process.env.ADMIN_WHATSAPP_NUMBER, `Low stock alert: ${lowStock.map((b) => `${b.title} (${b.stock_quantity})`).join(', ')}`);
    }
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

export async function saleInvoice(req, res, next) {
  try {
    const [[sale]] = await pool.query(
      `SELECT s.*, c.name AS customer_name, u.name AS cashier_name
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id JOIN users u ON u.id = s.cashier_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!sale) throw new AppError('Sale not found', 404);
    const [items] = await pool.query(
      'SELECT si.*, b.title FROM sale_items si JOIN books b ON b.id = si.book_id WHERE si.sale_id = ?',
      [req.params.id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${sale.id}.pdf`);
    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);
    doc.fontSize(20).text('Bookshop Invoice');
    doc.moveDown().fontSize(10).text(`Invoice #: ${sale.id}`).text(`Date: ${sale.sale_date}`).text(`Cashier: ${sale.cashier_name}`);
    doc.text(`Customer: ${sale.customer_name || 'Walk-in'}`).moveDown();
    items.forEach((item) => doc.text(`${item.title} x ${item.quantity} @ ${item.unit_price} = ${item.subtotal}`));
    doc.moveDown().text(`Discount: ${sale.discount}`).fontSize(14).text(`Total: ${sale.total_amount}`);
    doc.end();
  } catch (error) {
    next(error);
  }
}
