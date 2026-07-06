import type { Request, Response } from 'express';
import { User, Department, Ward, Role, Permission, UserDevice } from '../../config/db.js';
import { findWardId } from '../../utils/spatialUtils.js';
import { GamificationService } from '../../services/gamificationService.js';
import { AuditService } from '../../services/auditService.js';
import { Op } from 'sequelize';
import type { AuthRequest } from './user.utils.js';
import { StorageService } from '../../services/storageService.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const updateDeviceToken = async (req: AuthRequest, res: Response) => {
    try {
        const { fcm_token } = req.body;
        const userAuth = (req as any).user;

        if (!userAuth || !userAuth.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!fcm_token) {
            return res.status(400).json({ error: 'fcm_token is required' });
        }

        // Upsert device token
        const [device, created] = await UserDevice.findOrCreate({
            where: { fcm_token },
            defaults: {
                user_id: userAuth.id,
                fcm_token
            }
        });

        if (!created && device.user_id !== userAuth.id) {
            // Token belongs to someone else now, update owner
            device.user_id = userAuth.id;
            await device.save();
        }

        res.json({ success: true, message: 'Device token updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role, ward_id, department_id, is_active, home_location, alert_radius_meters } = req.body;

        const user = await User.findByPk(id as string);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const isSelf = req.user && req.user.id === id;
        const hasManagePerm = req.user && req.user.permissions?.includes('users:manage');

        if (!isSelf && !hasManagePerm) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        if (!hasManagePerm) {
            if (role !== undefined || ward_id !== undefined || department_id !== undefined || is_active !== undefined) {
                return res.status(403).json({ error: 'Forbidden: Cannot update administrative fields' });
            }
        }

        if (role) {
            const oldRole = user.role;
            user.role = role;
            const { Role, UserRole } = await import('../../config/db.js');
            let mappedRole = role.toLowerCase();
            if (mappedRole === 'staff') mappedRole = 'field_officer';
            else if (mappedRole === 'authority') mappedRole = 'dept_head';
            
            const dbRole = await Role.findOne({ where: { name: mappedRole } });
            if (dbRole) {
                await UserRole.destroy({ where: { user_id: user.id } });
                await UserRole.create({ user_id: user.id, role_id: dbRole.id });
            }

            // Audit the role change
            AuditService.log({
                actor_id: req.user?.id || 'SYSTEM',
                event_type: 'user.role_changed',
                target_resource: 'user',
                target_resource_id: user.id,
                old_value: { role: oldRole },
                new_value: { role: mappedRole },
            });
        }
        if (ward_id) user.ward_id = ward_id;
        if (department_id) user.department_id = department_id;
        if (is_active !== undefined) user.is_active = is_active;
        if (home_location) {
            const lon = parseFloat(home_location.lon);
            const lat = parseFloat(home_location.lat);
            user.home_location = {
                type: 'Point',
                coordinates: [lon, lat]
            };

            // Automatically sync ward_id based on home_location
            const calculatedWardId = await findWardId(lon, lat);
            if (calculatedWardId) {
                user.ward_id = calculatedWardId;
            }
        }

        if (alert_radius_meters) user.alert_radius_meters = alert_radius_meters;

        await user.save();
        res.json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const leaderboard = await GamificationService.getLeaderboard();
        res.json(leaderboard);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const identifier = req.userIdentifier;
        if (!identifier) return res.status(401).json({ error: 'Not authenticated' });

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        console.log(`[UserController] getMyProfile identity=${identifier}, isUUID=${isUUID}`);
        
        const orConditions: any[] = [
            { phone: identifier },
            { email: identifier }
        ];
        
        if (isUUID) {
            orConditions.push({ id: identifier });
        }

        const user = await User.findOne({ 
            where: {
                [Op.or]: orConditions
            },
            include: [
                { model: Department, as: 'department' },
                { model: Ward, as: 'ward' },
                {
                    model: Role,
                    as: 'roles',
                    include: [{ model: Permission, as: 'permissions' }]
                }
            ]
        });
        
        if (!user) return res.status(404).json({ error: 'Profile not found' });
        
        const attachedPermissions = (user as any).roles?.flatMap((r: any) => (r.permissions || []).map((p: any) => p.key)) || [];
        const attachedRoles = (user as any).roles?.map((r: any) => r.name) || [];
        
        const userData = user.toJSON();
        if (userData.avatar_url) {
            try {
                const freshPresignedUrl = await StorageService.getPresignedUrl(userData.avatar_url);
                userData.avatar_url = freshPresignedUrl;

                // Sync with Supabase Auth metadata asynchronously
                const userMetadata = req.user?.user_metadata || {};
                if (userMetadata.avatar_url !== freshPresignedUrl) {
                    supabaseAdmin.auth.admin.updateUserById(user.id, {
                        user_metadata: {
                            ...userMetadata,
                            avatar_url: freshPresignedUrl
                        }
                    }).catch((err: any) => console.error('[Supabase Sync Error]', err.message));
                }
            } catch (err: any) {
                console.error('Error generating presigned URL for avatar:', err.message);
            }
        }

        res.json({
            ...userData,
            roles: attachedRoles,
            permissions: attachedPermissions
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
