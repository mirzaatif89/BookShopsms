import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPurchase, listPurchases, receivePurchase } from '../controllers/purchases.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));
router.get('/', listPurchases);
router.post(
  '/',
  [
    body('supplier_id').isInt(),
    body('items').isArray({ min: 1 }),
    body('items.*.book_id').isInt(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unit_cost').isFloat({ min: 0 })
  ],
  validate,
  createPurchase
);
router.post('/:id/receive', param('id').isInt(), validate, receivePurchase);

export default router;
