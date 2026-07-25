import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adjustVariantStock, createProduct, getProduct, listProducts, updateProduct } from '../controllers/products.controller.js';

const router = Router();

const productRules = [
  body('name').notEmpty(),
  body('category_id').optional({ nullable: true }).isInt(),
  body('subcategory_id').optional({ nullable: true }).isInt(),
  body('supplier_id').optional({ nullable: true }).isInt(),
  body('purchase_price').optional().isFloat({ min: 0 }),
  body('sale_price').optional().isFloat({ min: 0 }),
  body('variants').optional().isArray(),
  body('variants.*.variant_name').optional().notEmpty(),
  body('variants.*.sku').optional().notEmpty(),
  body('variants.*.purchase_price').optional().isFloat({ min: 0 }),
  body('variants.*.sale_price').optional().isFloat({ min: 0 }),
  body('variants.*.stock_quantity').optional().isInt({ min: 0 }),
  body('variants.*.minimum_stock_level').optional().isInt({ min: 0 })
];

router.use(authenticate);
router.get('/', listProducts);
router.get('/:id', param('id').isInt(), validate, getProduct);
router.post('/', authorize('admin', 'manager', 'inventory_staff'), productRules, validate, createProduct);
router.put('/:id', authorize('admin', 'manager', 'inventory_staff'), param('id').isInt(), validate, updateProduct);
router.post(
  '/:id/variants/:variantId/adjust',
  authorize('admin', 'manager', 'inventory_staff'),
  [
    param('id').isInt(),
    param('variantId').isInt(),
    body('quantity_change').isInt({ min: -100000, max: 100000 }).not().equals('0'),
    body('movement_type').optional().isIn(['received', 'sold', 'adjusted', 'damaged', 'returned']),
    body('reason').optional().isString()
  ],
  validate,
  adjustVariantStock
);

export default router;
