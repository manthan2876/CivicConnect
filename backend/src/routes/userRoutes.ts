import { Router } from 'express';
import { getAllUsers, getStaff, getMyProfile, updateUserProfile, getLeaderboard, updateDeviceToken, createUser, resetUserPassword, updateUserAvatar } from '../controllers/user/index.js';
import { verifySupabaseToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// All user routes require authentication
router.use(verifySupabaseToken);

router.get('/', requirePermission('users:manage'), getAllUsers);
router.post('/', requirePermission('users:manage'), createUser);
router.post('/:id/reset-password', requirePermission('users:manage'), resetUserPassword);
router.get('/me', getMyProfile);
router.post('/avatar', upload.single('avatar'), updateUserAvatar);
router.patch('/:id', updateUserProfile); // Self-check or users:manage checked inside controller
router.get('/staff', requirePermission('report:assign'), getStaff);
router.get('/leaderboard', getLeaderboard);
router.post('/device-token', updateDeviceToken);

export default router;
