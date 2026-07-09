import type { Response } from 'express';
import { User, Issue, Repair } from '../../config/db.js';
import { AuditService } from '../../services/auditService.js';
import { sendNotificationToUser, broadcastNotification } from '../../services/notificationService.js';
import { GamificationService } from '../../services/gamificationService.js';
import type { AuthRequest } from './report.utils.js';

export const citizenConfirmResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const userAuth = (req as any).user;

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        const reporterIds = issue.reporter_ids || [issue.reporter_id];
        if (!userAuth || !reporterIds.includes(userAuth.id)) {
            return res.status(403).json({ error: 'Access denied. Only the original reporter can verify the resolution.' });
        }

        if (issue.status !== 'Pending Citizen Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting citizen confirmation' });
        }

        issue.status = 'Resolved';
        await issue.save();

        const repair = await Repair.findOne({ where: { issue_id: issue.id }, order: [['createdAt', 'DESC']] });
        if (repair) {
            repair.closed_at = new Date();
            await repair.save();
        }

        const baseCredits = GamificationService.calculateCredits(issue.priority_score, !!issue.s3_pre_key, !!issue.s3_audio_key);
        const bonusCredits = 20;
        const totalAwarded = baseCredits + bonusCredits;

        for (const rId of reporterIds) {
            await GamificationService.addCredits(rId as string, totalAwarded, 'RESOLVED_AND_VERIFIED');
            const rUser = await User.findByPk(rId);
            const rReportCount = await Issue.count({ where: { reporter_id: rId as string } });
            if (rUser) {
                GamificationService.checkMilestones(rId as string, rReportCount, rUser.green_credits, 1);
            }
        }

        AuditService.log({
            actor_id: userAuth.id,
            event_type: 'report.citizen_confirmed',
            target_resource: 'issue',
            target_resource_id: issue.id,
            old_value: { status: 'Pending Citizen Confirmation' },
            new_value: { status: 'Resolved' },
            payload: { credits_awarded: totalAwarded },
        });

        if (issue.assigned_staff_id) {
            sendNotificationToUser(
                issue.assigned_staff_id,
                'Great Job! 🌟',
                `The reporter has verified your work for issue ${issue.id.slice(0, 8)}. Keep up the good work!`,
                { issue_id: issue.id, type: 'WORK_VERIFIED' }
            ).catch((err: any) => console.error('[Notification] Staff verification notify failed:', err));
        }

        res.json({ success: true, message: 'Thank you for verifying! Credits have been awarded.', creditsAwarded: totalAwarded });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const citizenDisputeResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userAuth = (req as any).user;

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        const reporterIds = issue.reporter_ids || [issue.reporter_id];
        if (!userAuth || !reporterIds.includes(userAuth.id)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        issue.status = 'Disputed';
        await issue.save();

        AuditService.log({
            actor_id: userAuth.id,
            event_type: 'report.citizen_disputed',
            target_resource: 'issue',
            target_resource_id: issue.id,
            old_value: { status: 'Pending Citizen Confirmation' },
            new_value: { status: 'Disputed' },
            payload: { reason },
        });

        if (issue.assigned_staff_id) {
            sendNotificationToUser(
                issue.assigned_staff_id,
                'Resolution Disputed',
                `The reporter was not satisfied with the work for issue ${issue.id.slice(0, 8)}. Reason: ${reason}`,
                { issue_id: issue.id, type: 'WORK_DISPUTED' }
            ).catch((err: any) => console.error('[Notification] Staff dispute notify failed:', err));
        }

        broadcastNotification(
            `authority_${issue.assigned_department_id}`,
            'Citizen Dispute Raised',
            `Issue ${issue.id.slice(0, 8)} has been disputed by the reporter. Manual review required.`,
            { issue_id: issue.id, type: 'DISPUTE_RAISED' }
        ).catch((err: any) => console.error('[Notification] Authority dispute notify failed:', err));

        res.json({ success: true, message: 'Dispute recorded. A municipal authority will review this shortly.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const upvoteReport = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        issue.priority_score += 5;
        await issue.save();

        res.json({ success: true, priority_score: issue.priority_score });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
