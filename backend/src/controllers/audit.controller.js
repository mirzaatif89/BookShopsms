import { pool } from '../config/db.js';

export async function listAuditLogs(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT a.*, u.name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 200`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
