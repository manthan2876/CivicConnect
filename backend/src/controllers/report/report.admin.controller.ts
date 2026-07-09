import type { Response } from 'express';
import { Issue, AIFeedback } from '../../config/db.js';
import { StorageService } from '../../services/storageService.js';
import { AuditService } from '../../services/auditService.js';
import type { AuthRequest } from './report.utils.js';

export const updateReport = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, category, priority_score, assigned_staff_id } = req.body;

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        const permissions: string[] = req.user?.permissions || [];
        const isAssigned = issue.assigned_staff_id === req.user?.id;
        const isPrivilegedUser = ['admin', 'super_admin', 'hq_staff', 'dept_head'].includes(req.user?.role || '');

        if (!isPrivilegedUser && !isAssigned) {
            return res.status(403).json({ error: 'Forbidden: You can only update issues assigned to you' });
        }

        const oldStatus = issue.status;
        const oldAssignee = issue.assigned_staff_id;

        if (status) issue.status = status;
        if (category && issue.category !== category) {
            // Discrepancy detected: Log to AI Retraining Queue
            try {
                await AIFeedback.create({
                    issue_id: issue.id,
                    original_category: issue.category,
                    corrected_category: category,
                    media_url: (issue.s3_image_urls && issue.s3_image_urls.length > 0) ? issue.s3_image_urls[0] : (issue.s3_pre_key || null)
                });
                console.log(`[AI FEEDBACK] Issue ${issue.id} corrected from ${issue.category} to ${category}`);
            } catch (err) {
                console.error("Failed to log AI Feedback", err);
            }
            issue.category = category;
        }
        if (priority_score !== undefined) issue.priority_score = priority_score;
        if (assigned_staff_id !== undefined) issue.assigned_staff_id = assigned_staff_id;

        await issue.save();

        // Audit: status change
        if (status && status !== oldStatus) {
            AuditService.log({
                actor_id: req.user?.id || 'SYSTEM',
                event_type: 'report.status_changed',
                target_resource: 'issue',
                target_resource_id: issue.id,
                old_value: { status: oldStatus },
                new_value: { status },
            });
        }
        // Audit: assignment change
        if (assigned_staff_id !== undefined && assigned_staff_id !== oldAssignee) {
            AuditService.log({
                actor_id: req.user?.id || 'SYSTEM',
                event_type: 'report.assigned',
                target_resource: 'issue',
                target_resource_id: issue.id,
                old_value: { assigned_staff_id: oldAssignee },
                new_value: { assigned_staff_id },
            });
        }

        res.json({ success: true, issue });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkUpdateReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { ids, status, category } = req.body;
        const permissions: string[] = req.user?.permissions || [];
        
        if (!permissions.includes('report:bulk_update')) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions for bulk actions.' });
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No report IDs provided' });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (category) updateData.category = category;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        const [count] = await Issue.update(updateData, {
            where: {
                id: ids
            }
        });

        // Log the bulk activity
        AuditService.log({
            actor_id: req.user?.id || 'SYSTEM',
            event_type: 'report.bulk_updated',
            target_resource: 'issue',
            payload: { ids, updates: updateData, count },
        });

        res.json({ success: true, message: `Successfully updated ${count} reports`, count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteReport = async (req: AuthRequest, res: Response) => {
    try {
        const issueId = req.params.id as string;

        // 1. Fetch the issue to retrieve associated media URLs before deletion
        const issue = await Issue.findByPk(issueId);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        // 2. Perform S3 Storage Cleanup
        const bucketName = StorageService.getBucketName();
        const mediaUrls = [
            ...(issue.s3_image_urls || []),
            ...(issue.s3_audio_urls || [])
        ];

        console.log(`[CLEANUP] Initiating storage purge for Issue ${issueId}. Found ${mediaUrls.length} media items.`);

        for (const url of mediaUrls) {
            try {
                // The URL structure is: protocol://host:port/bucketName/objectKey
                const urlParts = url.split(`${bucketName}/`);
                if (urlParts.length > 1) {
                    const objectKey = urlParts[1] as string;
                    console.log(`[CLEANUP] Purging S3 object: ${objectKey}`);
                    await StorageService.deleteFile(objectKey);
                }
            } catch (storageErr) {
                console.error(`[CLEANUP] Non-fatal: Failed to delete media [${url}] from S3:`, storageErr);
            }
        }

        // 3. Destroy the Database Record
        await issue.destroy();

        // 4. Log the Deletion
        AuditService.log({
            actor_id: (req as any).user?.id || 'SYSTEM',
            event_type: 'report.deleted',
            target_resource: 'issue',
            target_resource_id: issueId,
            old_value: { category: issue.category, status: issue.status },
            payload: { description: issue.description?.slice(0, 120) },
        });

        res.json({
            success: true,
            message: 'Issue and associated media purged successfully'
        });
    } catch (error: any) {
        console.error('CRITICAL ERROR in deleteReport:', error);
        res.status(500).json({ error: error.message });
    }
};
