import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReturn, listReturns } from '../controllers/returns.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));
router.get('/', listReturns);
router.post(
  '/',
  [
    body('sale_id').isInt(),
    body('items').isArray({ min: 1 }),
    body('items.*.sale_item_id').isInt(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('refund_method').optional().isIn(['cash', 'card', 'bank_transfer', 'mobile_wallet', 'credit'])
  ],
  validate,
  createReturn
);

export default router;
