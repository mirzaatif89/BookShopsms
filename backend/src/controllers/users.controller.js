import bcrypt from 'bcryptjs';
import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.service.js';

export async function listUsers(req, res, next) {
  try {
    const [items] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'cashier' } = req.body;
    const result = await transaction(async (conn) => {
      const passwordHash = await bcrypt.hash(password, 10);
      const [created] = await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, passwordHash, role]);
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'user.create',
        entityType: 'user',
        entityId: created.insertId,
        newValue: { name, email, role },
        ipAddress: req.ip
      });
      return created.insertId;
    });
    res.status(201).json({ id: result, name, email, role });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const allowed = ['name', 'email', 'role'];
    const fields = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!fields.length && !req.body.password) throw new AppError('No fields to update', 400);
    await transaction(async (conn) => {
      const [[previous]] = await conn.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
      if (!previous) throw new AppError('User not found', 404);
      if (fields.length) {
        await conn.query(
          `UPDATE users SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map((field) => req.body[field]), req.params.id]
        );
      }
      if (req.body.password) {
        await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(req.body.password, 10), req.params.id]);
      }
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'user.update',
        entityType: 'user',
        entityId: req.params.id,
        previousValue: previous,
        newValue: req.body,
        ipAddress: req.ip
      });
    });
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (error) {
    next(error);
  }
}

export async function listRoles(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT r.*, GROUP_CONCAT(p.code ORDER BY p.code) AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       GROUP BY r.id
       ORDER BY r.id`
    );
    const [permissions] = await pool.query('SELECT * FROM permissions ORDER BY code');
    res.json({ items, permissions });
  } catch (error) {
    next(error);
  }
}
