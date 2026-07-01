import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCategories, createCategory, deleteCategory, getExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary } from '../controllers/expenses.controller';

const router = Router();
router.use(authenticate);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
router.get('/summary', getExpenseSummary);

export default router;
