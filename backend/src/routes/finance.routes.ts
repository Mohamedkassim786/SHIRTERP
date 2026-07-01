import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getAccounts, createAccount, getTransactions, createTransaction, getDashboard } from '../controllers/finance.controller';

const router = Router();

router.use(authenticate);

router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);

router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);

router.get('/dashboard', getDashboard);

export default router;
