import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, listRoles, listUsers, updateUser } from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', listUsers);
router.post(
  '/',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }), body('role').isIn(['admin', 'manager', 'cashier', 'inventory_staff'])],
  validate,
  createUser
);
router.put('/:id', param('id').isInt(), validate, updateUser);
router.get('/roles', listRoles);

export default router;
