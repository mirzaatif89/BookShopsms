import { pool } from '../config/db.js';
import { AppError } from '../middleware/error.js';

export function crudController({ table, fields, searchable = [] }) {
  const fieldList = fields.join(',');

  return {
    async list(req, res, next) {
      try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
        const offset = (page - 1) * limit;
        const params = [];
        let where = '';
        if (req.query.search && searchable.length) {
          where = `WHERE ${searchable.map((field) => `${field} LIKE ?`).join(' OR ')}`;
          params.push(...searchable.map(() => `%${req.query.search}%`));
        }
        const [items] = await pool.query(`SELECT * FROM ${table} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params);
        res.json({ items, page, limit, total });
      } catch (error) {
        next(error);
      }
    },
    async get(req, res, next) {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
        if (!rows.length) throw new AppError(`${table} record not found`, 404);
        res.json(rows[0]);
      } catch (error) {
        next(error);
      }
    },
    async create(req, res, next) {
      try {
        const values = fields.map((field) => req.body[field] ?? null);
        const [result] = await pool.query(`INSERT INTO ${table} (${fieldList}) VALUES (${fields.map(() => '?').join(',')})`, values);
        res.status(201).json({ id: result.insertId, ...req.body });
      } catch (error) {
        next(error);
      }
    },
    async update(req, res, next) {
      try {
        const updateFields = fields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
        if (!updateFields.length) throw new AppError('No fields to update', 400);
        const [result] = await pool.query(
          `UPDATE ${table} SET ${updateFields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
          [...updateFields.map((field) => req.body[field]), req.params.id]
        );
        if (!result.affectedRows) throw new AppError(`${table} record not found`, 404);
        res.json({ id: Number(req.params.id), ...req.body });
      } catch (error) {
        next(error);
      }
    },
    async remove(req, res, next) {
      try {
        const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
        if (!result.affectedRows) throw new AppError(`${table} record not found`, 404);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  };
}
