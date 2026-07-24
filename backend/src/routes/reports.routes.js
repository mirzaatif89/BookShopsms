import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { bestSellingBooks, lowStock, profitLoss, salesSummary } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));
router.get('/sales-summary', salesSummary);
router.get('/best-selling', bestSellingBooks);
router.get('/low-stock', lowStock);
router.get('/profit-loss', profitLoss);

export default router;
