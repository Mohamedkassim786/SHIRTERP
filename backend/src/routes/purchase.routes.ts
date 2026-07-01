import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPurchaseOrders, createPurchaseOrder, createGRN } from '../controllers/purchase.controller';

const router = Router();

router.use(authenticate);

router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', createPurchaseOrder);
router.post('/grn', createGRN);

export default router;
