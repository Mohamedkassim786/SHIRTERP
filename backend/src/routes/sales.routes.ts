import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSalesInvoices, getInvoiceById, createSalesInvoice, receivePayment } from '../controllers/sales.controller';

const router = Router();

router.use(authenticate);

router.get('/invoices', getSalesInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createSalesInvoice);
router.post('/payments', receivePayment);

export default router;
