import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';

const router = Router();

// These routes need to be public or at least accessible by the customer viewing the invoice
// We will not apply the strict 'authenticate' middleware here, or we'll apply a lighter one if needed.
// For now, keep them open for public invoice payment links.
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

export default router;
