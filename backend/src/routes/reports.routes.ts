import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getFullReports } from '../controllers/reports.controller';

const router = Router();
router.use(authenticate);

router.get('/', getFullReports);

export default router;
