import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { readSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', readSettings);
router.put('/', authorize('admin'), updateSettings);

export default router;
