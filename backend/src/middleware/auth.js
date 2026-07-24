import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AppError } from './error.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication required', 401);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) throw new AppError('User not found', 401);

    req.user = rows[0];
    next();
  } catch (error) {
    next(error.status ? error : new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    next();
  };
}
