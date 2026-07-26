import { Router } from 'express';
import { body, param } from 'express-validator';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = crudController({
  table: 'expenses',
  fields: ['category', 'amount', 'expense_date', 'payment_method', 'description', 'user_id'],
  searchable: ['category', 'description']
});

router.use(authenticate, authorize('admin', 'manager'));
router.get('/', controller.list);
router.get('/:id', param('id').isInt(), validate, controller.get);
router.post(
  '/',
  [
    body('category').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('expense_date').isISO8601(),
    body('payment_method').optional().isIn(['cash', 'card', 'bank_transfer', 'mobile_wallet'])
  ],
  validate,
  (req, res, next) => {
    req.body.user_id = req.user.id;
    controller.create(req, res, next);
  }
);
router.put('/:id', param('id').isInt(), validate, controller.update);
router.delete('/:id', authorize('admin'), param('id').isInt(), validate, controller.remove);

export default router;
