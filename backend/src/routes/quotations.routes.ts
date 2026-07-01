import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getQuotations, createQuotation, updateQuotationStatus, convertToOrder } from '../controllers/quotations.controller';

const router = Router();
router.use(authenticate);

router.get('/', getQuotations);
router.post('/', createQuotation);
router.put('/:id/status', updateQuotationStatus);
router.post('/:id/convert', convertToOrder);

export default router;
