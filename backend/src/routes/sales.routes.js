import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSale, listSales, saleInvoice } from '../controllers/sales.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), listSales);
router.post(
  '/',
  authorize('admin', 'manager', 'cashier'),
  [
    body('items').isArray({ min: 1 }),
    body('items.*.book_id').isInt(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('payment_method').isIn(['cash', 'easypaisa', 'jazzcash'])
  ],
  validate,
  createSale
);
router.get('/:id/invoice', param('id').isInt(), validate, saleInvoice);

export default router;
