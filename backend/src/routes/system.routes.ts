import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getActivityLogs, exportDatabase } from '../controllers/system.controller';

const router = Router();

// Apply auth middleware to all system routes
router.use(authenticate);

// Activity Logs
router.get('/logs', getActivityLogs);

// Database Backup (JSON Export)
router.get('/backup', exportDatabase);

export default router;
