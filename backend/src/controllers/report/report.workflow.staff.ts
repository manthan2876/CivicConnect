import type { Response } from 'express';
import { User, Issue, Repair } from '../../config/db.js';
import { StorageService } from '../../services/storageService.js';
import { AuditService } from '../../services/auditService.js';
import { sendNotificationToUser, broadcastNotification } from '../../services/notificationService.js';
import type { AuthRequest } from './report.utils.js';

export const proposeResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const file = req.file || req.files?.['image']?.[0] || req.files?.[0];
        const userAuth = (req as any).user;
        
        if (!userAuth) {
            return res.status(401).json({ error: 'User unauthorized' });
        }

        const user = await User.findByPk(userAuth.id);
        if (!user || (user.role !== 'staff' && user.role !== 'authority' && user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ error: 'Access denied. Only assigned staff or authorities can propose resolution.' });
        }

        if (!file) return res.status(400).json({ error: 'Resolution image required' });

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (user.role === 'staff' && issue.assigned_staff_id !== user.id) {
            return res.status(403).json({ error: 'Access denied. You are not assigned to this issue.' });
        }

        if (user.role === 'authority' && user.department_id && issue.assigned_department_id !== user.department_id) {
            return res.status(403).json({ error: 'Access denied. You do not belong to the department assigned to this issue.' });
        }

        const imageUrl = await StorageService.uploadFile(file, 'repairs') || '';

        await Repair.create({
            issue_id: issue.id,
            worker_id: user.id,
            s3_post_key: imageUrl,
        });

        issue.status = 'Pending Confirmation';
        await issue.save();

        AuditService.log({
            actor_id: user.id,
            event_type: 'report.resolution_proposed',
            target_resource: 'issue',
            target_resource_id: issue.id,
            new_value: { status: 'Pending Confirmation' },
            payload: { repair_image: imageUrl },
        });

        broadcastNotification(
            `authority_${issue.assigned_department_id}`, 
            'New Resolution to Approve',
            `Staff ${user.phone || ''} has submitted work for issue ${issue.id.slice(0, 8)}.`,
            { issue_id: issue.id, type: 'APPROVAL_REQUIRED' }
        ).catch((err: any) => console.error('[Notification] Authority notify failed:', err));

        if (issue.reporter_id) {
            sendNotificationToUser(
                issue.reporter_id,
                'Work in Progress',
                `Staff has completed the work for issue ${issue.id.slice(0, 8)}. It is now being verified by authorities.`,
                { issue_id: issue.id, type: 'RESOLUTION_PROPOSED' }
            ).catch((err: any) => console.error('[Notification] Proposal notify failed:', err));
        }

        res.json({ success: true, message: 'Resolution proposed and awaiting authority approval', imageUrl });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
