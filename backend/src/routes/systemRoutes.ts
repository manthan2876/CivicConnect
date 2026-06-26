import { Router } from 'express';
import { getWards, createWard } from '../controllers/wardController.js';
import { getZones, createZone } from '../controllers/zoneController.js';
import { getUlbs, createUlb } from '../controllers/ulbController.js';
import { wipeData } from '../controllers/systemController.js';
import { verifySupabaseToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = Router();

// Apply auth verification to all routes
router.use(verifySupabaseToken);

// Wards management
router.get('/wards', getWards);
router.post('/wards', requirePermission('users:manage'), createWard);

// Zones management
router.get('/zones', getZones);
router.post('/zones', requirePermission('users:manage'), createZone);

// ULB Boundaries management
router.get('/ulb-boundaries', getUlbs);
router.post('/ulb-boundaries', requirePermission('users:manage'), createUlb);

// Database wipe
router.post('/wipe-data', requirePermission('users:manage'), wipeData);

export default router;
