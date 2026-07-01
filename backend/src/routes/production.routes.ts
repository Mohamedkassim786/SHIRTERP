import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getCustomerOrders, createCustomerOrder, 
  getWorkOrders, createWorkOrder, addProductionStage,
  getFinishedGoods, getProductionDashboard
} from '../controllers/production.controller';

const router = Router();

router.use(authenticate);

// Orders
router.get('/orders', getCustomerOrders);
router.post('/orders', createCustomerOrder);

// Production
router.get('/dashboard', getProductionDashboard);
router.get('/work-orders', getWorkOrders);
router.post('/work-orders', createWorkOrder);
router.post('/stages', addProductionStage);

// Inventory
router.get('/finished-goods', getFinishedGoods);

export default router;
