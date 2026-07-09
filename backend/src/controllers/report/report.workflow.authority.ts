import type { Response } from 'express';
import { Issue } from '../../config/db.js';
import { AuditService } from '../../services/auditService.js';
import { sendNotificationToUser } from '../../services/notificationService.js';
import type { AuthRequest } from './report.utils.js';

export const confirmResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const userAuth = (req as any).user;

        const permissions: string[] = userAuth?.permissions || [];
        if (!userAuth || !permissions.includes('report:confirm_resolution')) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions to approve resolutions.' });
        }

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (issue.status !== 'Pending Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting confirmation' });
        }

        issue.status = 'Pending Citizen Confirmation';
        await issue.save();

        AuditService.log({
            actor_id: userAuth.id,
            event_type: 'report.resolution_confirmed',
            target_resource: 'issue',
            target_resource_id: issue.id,
            old_value: { status: 'Pending Confirmation' },
            new_value: { status: 'Pending Citizen Confirmation' },
        });

        const reporterIds = issue.reporter_ids || [issue.reporter_id];
        for (const rId of reporterIds) {
            sendNotificationToUser(
                rId as string,
                'Verify Resolution',
                `Authority has approved the work for issue ${issue.id.slice(0, 8)}. Please confirm if you are satisfied.`,
                { issue_id: issue.id, type: 'VERIFICATION_REQUIRED' }
            ).catch((err: any) => console.error('[Notification] Verification notify failed:', err));
        }

        res.json({ success: true, message: 'Resolution approved by authority. Now awaiting citizen confirmation.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const rejectResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userAuth = (req as any).user;

        const permissions: string[] = userAuth?.permissions || [];
        if (!userAuth || !permissions.includes('report:reject_resolution')) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions to reject resolutions.' });
        }

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (issue.status !== 'Pending Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting confirmation' });
        }

        issue.status = 'In Progress';
        await issue.save();

        AuditService.log({
            actor_id: userAuth.id,
            event_type: 'report.resolution_rejected',
            target_resource: 'issue',
            target_resource_id: issue.id,
            old_value: { status: 'Pending Confirmation' },
            new_value: { status: 'In Progress' },
            payload: { reason: reason || 'Quality of work not satisfactory' },
        });

        if (issue.assigned_staff_id) {
            sendNotificationToUser(
                issue.assigned_staff_id,
                'Resolution Rejected',
                `Your resolution for issue ${issue.id.slice(0, 8)} was rejected. Reason: ${reason || 'Needs more work.'}`,
                { issue_id: issue.id, type: 'TASK_REJECTED' }
            ).catch((err: any) => console.error('[Notification] Rejection notify failed:', err));
        }

        res.json({ success: true, message: 'Resolution rejected, issue returned to staff' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
