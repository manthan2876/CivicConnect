import { Router } from 'express';
import { getWards, createWard, updateWard, deleteWard } from '../controllers/wardController.js';
import { getZones, createZone, updateZone, deleteZone } from '../controllers/zoneController.js';
import { getUlbs, createUlb, updateUlb, deleteUlb } from '../controllers/ulbController.js';
import { wipeData } from '../controllers/systemController.js';
import { verifySupabaseToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = Router();

// Apply auth verification to all routes
router.use(verifySupabaseToken);

// Wards management
router.get('/wards', getWards);
router.post('/wards', requirePermission('users:manage'), createWard);
router.patch('/wards/:id', requirePermission('users:manage'), updateWard);
router.delete('/wards/:id', requirePermission('users:manage'), deleteWard);

// Zones management
router.get('/zones', getZones);
router.post('/zones', requirePermission('users:manage'), createZone);
router.patch('/zones/:id', requirePermission('users:manage'), updateZone);
router.delete('/zones/:id', requirePermission('users:manage'), deleteZone);

// ULB Boundaries management
router.get('/ulb-boundaries', getUlbs);
router.post('/ulb-boundaries', requirePermission('users:manage'), createUlb);
router.patch('/ulb-boundaries/:id', requirePermission('users:manage'), updateUlb);
router.delete('/ulb-boundaries/:id', requirePermission('users:manage'), deleteUlb);

// Database wipe
router.post('/wipe-data', requirePermission('users:manage'), wipeData);

export default router;
