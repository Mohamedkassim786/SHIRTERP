import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSettings, updateSettings, getUsers, createUser, updateUser, getRoles, createRole } from '../controllers/admin.controller';

const router = Router();

// Admin routes require authentication
router.use(authenticate);

// Settings can be read by anyone authenticated, but only updated by ADMIN
router.get('/settings', getSettings);

// Require Admin role for the rest
router.use(authorize(['ADMIN', 'Admin']));

router.put('/settings', updateSettings);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

router.get('/roles', getRoles);
router.post('/roles', createRole);

export default router;
