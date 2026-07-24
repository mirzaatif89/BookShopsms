import { Router } from 'express';
import { body, param } from 'express-validator';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const controller = crudController({ table: 'suppliers', fields: ['name', 'contact_number', 'address', 'email'], searchable: ['name', 'contact_number', 'email'] });

router.use(authenticate, authorize('admin', 'manager'));
router.get('/', controller.list);
router.get('/:id', param('id').isInt(), validate, controller.get);
router.post('/', body('name').notEmpty(), validate, controller.create);
router.put('/:id', param('id').isInt(), validate, controller.update);
router.delete('/:id', authorize('admin'), param('id').isInt(), validate, controller.remove);

export default router;
