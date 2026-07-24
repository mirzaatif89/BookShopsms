import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBook, deleteBook, getBook, listBooks, updateBook } from '../controllers/books.controller.js';

const router = Router();
const bookRules = [
  body('title').notEmpty(),
  body('author').notEmpty(),
  body('isbn').notEmpty(),
  body('cost_price').isFloat({ min: 0 }),
  body('sale_price').isFloat({ min: 0 }),
  body('stock_quantity').isInt({ min: 0 }),
  body('reorder_level').isInt({ min: 0 })
];

router.use(authenticate);
router.get('/', listBooks);
router.get('/:id', param('id').isInt(), validate, getBook);
router.post('/', authorize('admin', 'manager'), bookRules, validate, createBook);
router.put('/:id', authorize('admin', 'manager'), param('id').isInt(), validate, updateBook);
router.delete('/:id', authorize('admin'), param('id').isInt(), validate, deleteBook);

export default router;
