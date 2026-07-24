import { pool } from '../config/db.js';
import { AppError } from '../middleware/error.js';

const bookFields = ['title', 'author', 'isbn', 'category_id', 'publisher', 'cost_price', 'sale_price', 'stock_quantity', 'reorder_level', 'image_url'];

function paging(req) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

export async function listBooks(req, res, next) {
  try {
    const { page, limit, offset } = paging(req);
    const params = [];
    const filters = [];
    if (req.query.search) {
      filters.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)');
      const q = `%${req.query.search}%`;
      params.push(q, q, q);
    }
    if (req.query.category_id) {
      filters.push('b.category_id = ?');
      params.push(req.query.category_id);
    }
    if (req.query.low_stock === 'true') filters.push('b.stock_quantity <= b.reorder_level');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [items] = await pool.query(
      `SELECT b.*, c.name AS category_name FROM books b LEFT JOIN categories c ON c.id = b.category_id ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM books b ${where}`, params);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
}

export async function getBook(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!rows.length) throw new AppError('Book not found', 404);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function createBook(req, res, next) {
  try {
    const values = bookFields.map((field) => req.body[field] ?? null);
    const [result] = await pool.query(`INSERT INTO books (${bookFields.join(',')}) VALUES (${bookFields.map(() => '?').join(',')})`, values);
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    next(error);
  }
}

export async function updateBook(req, res, next) {
  try {
    const fields = bookFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!fields.length) throw new AppError('No fields to update', 400);
    const values = fields.map((field) => req.body[field]);
    const [result] = await pool.query(`UPDATE books SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
    if (!result.affectedRows) throw new AppError('Book not found', 404);
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (error) {
    next(error);
  }
}

export async function deleteBook(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new AppError('Book not found', 404);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
