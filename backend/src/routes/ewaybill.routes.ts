import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getEWayBills, getEWayBillById, createEWayBill, cancelEWayBill } from '../controllers/ewaybill.controller';

const router = Router();

router.use(authenticate);

router.get('/',          getEWayBills);
router.get('/:id',       getEWayBillById);
router.post('/',         createEWayBill);
router.patch('/:id/cancel', cancelEWayBill);

export default router;
