import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPurchase, listPurchases, receivePurchase } from '../controllers/purchases.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'manager', 'inventory_staff'));
router.get('/', listPurchases);
router.post(
  '/',
  [
    body('supplier_id').isInt(),
    body('items').isArray({ min: 1 }),
    body('items.*.book_id').optional().isInt(),
    body('items.*.product_variant_id').optional().isInt(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unit_cost').isFloat({ min: 0 }),
    body('items.*.discount').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('tax_amount').optional().isFloat({ min: 0 }),
    body('amount_paid').optional().isFloat({ min: 0 }),
    body('payment_method').optional().isIn(['cash', 'card', 'bank_transfer', 'mobile_wallet', 'credit'])
  ],
  validate,
  createPurchase
);
router.post('/:id/receive', param('id').isInt(), validate, receivePurchase);

export default router;
