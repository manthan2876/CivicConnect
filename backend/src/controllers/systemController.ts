import type { Request, Response } from 'express';
import { User, Department, Ward, Issue, Repair, AuditLog, Notification, AIFeedback, UserDevice, UserRole, UlbBoundary, ProcessingJob, Zone, sequelize } from '../config/db.js';
import { supabaseAdmin } from '../config/supabase.js';
import { Op } from 'sequelize';

export interface AuthRequest extends Request {
    user?: any;
}

/**
 * Wipe out the entire database (destructive). Preserves only admin users.
 * Deletes all matching users from Supabase Auth.
 */
export const wipeData = async (req: AuthRequest, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        console.log('🔥 Initiating Full Database Wipe...');
        const actor = req.user;

        // 1. Find all non-admin users to delete from Supabase Auth
        const nonAdmins = await User.findAll({
            where: {
                role: { [Op.notIn]: ['admin', 'super_admin'] }
            },
            attributes: ['id', 'email']
        });

        console.log(`Removing ${nonAdmins.length} users from Supabase Auth...`);
        for (const u of nonAdmins) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(u.id);
                console.log(`Deleted Supabase user: ${u.email}`);
            } catch (err: any) {
                console.warn(`Failed to delete Supabase user ${u.email}:`, err.message);
            }
        }

        // 2. Clear FK dependencies on remaining Admins
        await User.update({
            ward_id: null,
            department_id: null,
            ulb_id: null
        }, {
            where: {},
            transaction
        });

        // 3. Clear database tables in strict sequential order
        await Repair.destroy({ where: {}, transaction });
        await ProcessingJob.destroy({ where: {}, transaction });
        await AIFeedback.destroy({ where: {}, transaction });
        await Notification.destroy({ where: {}, transaction });
        await Issue.destroy({ where: {}, transaction });
        await UserDevice.destroy({ where: {}, transaction });

        // Unlink roles for non-admin users
        await UserRole.destroy({
            where: {
                user_id: { [Op.in]: nonAdmins.map(u => u.id) }
            },
            transaction
        });

        // Delete non-admin users
        await User.destroy({
            where: {
                role: { [Op.notIn]: ['admin', 'super_admin'] }
            },
            transaction
        });

        // Delete Wards, Departments, Zones, and ULB boundaries
        await Ward.destroy({ where: {}, transaction });
        await Department.destroy({ where: {}, transaction });
        await Zone.destroy({ where: {}, transaction });
        await UlbBoundary.destroy({ where: {}, transaction });

        // Wipe Audit Logs
        await AuditLog.destroy({ where: {}, transaction });

        await transaction.commit();
        console.log('✔ Full Database Wipe Complete.');

        // Write a fresh audit log entry to record the wipe event
        await AuditLog.create({
            actor_id: actor?.id || 'SYSTEM',
            event_type: 'system.database_wipe',
            target_resource: 'database',
            payload: {
                message: 'All system transaction data, departments, wards, ULBs, and non-admin users were wiped.',
                actor_email: actor?.email || 'Unknown'
            }
        });

        res.json({ success: true, message: 'Database wiped successfully.' });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Wipe failed:', error);
        res.status(500).json({ error: error.message });
    }
};
