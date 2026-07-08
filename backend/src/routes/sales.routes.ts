import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSalesInvoices, getInvoiceById, createSalesInvoice,
  receivePayment, getPaymentReceipt,
  proposeDiscount, getSettlementInvoice
} from '../controllers/sales.controller';

const router = Router();

router.use(authenticate);

router.get('/invoices', getSalesInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createSalesInvoice);
router.get('/invoices/:id/settlement-print', getSettlementInvoice);
router.patch('/invoices/:id/discount', proposeDiscount);
router.post('/payments', receivePayment);
router.get('/payments/:paymentId/receipt', getPaymentReceipt);

export default router;

