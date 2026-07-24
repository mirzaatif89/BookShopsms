import { Router } from 'express';
import { body, param } from 'express-validator';
import { crudController } from '../controllers/crud.controller.js';
import { pool } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = crudController({ table: 'customers', fields: ['name', 'phone', 'email', 'address', 'credit_balance'], searchable: ['name', 'phone', 'email'] });

router.use(authenticate);
router.get('/', controller.list);
router.get('/:id', param('id').isInt(), validate, controller.get);
router.get('/:id/history', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const [items] = await pool.query('SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC', [req.params.id]);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router.post('/', body('name').notEmpty(), validate, controller.create);
router.put('/:id', param('id').isInt(), validate, controller.update);
router.delete('/:id', param('id').isInt(), validate, controller.remove);

export default router;
