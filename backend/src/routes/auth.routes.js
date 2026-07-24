import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { login, me, register } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], validate, login);
router.get('/me', authenticate, me);
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }), body('role').isIn(['admin', 'manager', 'cashier'])],
  validate,
  register
);

export default router;
