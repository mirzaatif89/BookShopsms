import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { listAuditLogs } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', listAuditLogs);

export default router;
