import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User, Issue, Repair, AIFeedback, sequelize } from '../config/db.js';
import { sendNotificationToUser, broadcastNotification } from '../services/notificationService.js';
import { AIService } from '../services/aiService.js';
import { SpatialService } from '../services/spatialService.js';
import { GeoIntelligenceService } from '../services/geoIntelligenceService.js';
import { AuditLog } from '../models/AuditLog.js';

import { StorageService } from '../services/storageService.js';
import { PriorityService } from '../services/priorityService.js';
import { findWardId } from '../utils/spatialUtils.js';
import { GamificationService } from '../services/gamificationService.js';
import { TriageService } from '../services/triageService.js';
import { RAGService } from '../services/ragService.js';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
    userIdentifier?: string;
    files?: any;
    user?: any;
}

// Categories that require privacy obfuscation for the reporter
const SENSITIVE_CATEGORIES = ['Illegal Construction', 'Encroachment', 'Criminal Activity', 'Vandalism'];

function obfuscateLocation(lon: number, lat: number) {
    // Add a random offset of ~15-30 meters (approx 0.0001 to 0.0003 degrees)
    const factor = 0.0002;
    const offsetLon = (Math.random() - 0.5) * factor;
    const offsetLat = (Math.random() - 0.5) * factor;
    return [lon + offsetLon, lat + offsetLat];
}





export const createReport = async (req: AuthRequest, res: Response) => {
    console.log('--- Incoming AI-Enhanced Issue Request ---');
    const files = req.files;
    const imageFile = files?.['image']?.[0];
    const audioFile = files?.['audio']?.[0];

    try {
        const { description, latitude, longitude } = req.body;
        const userAuth = (req as any).user;

        if (!userAuth) return res.status(401).json({ error: 'User unauthorized' });

        // 1. Ensure user exists in PostgreSQL (Look up by UUID)
        let user = await User.findByPk(userAuth.id);
        if (!user) {
            // Create user if they don't exist in our public table yet
            user = await User.create({
                id: userAuth.id,
                phone: userAuth.phone || null,
                email: userAuth.email || null
            });
        }


        // 2. Identify Ward
        console.log(`[DEBUG] Received Coordinates: Lon=${longitude}, Lat=${latitude}`);
        const ward_id = await findWardId(parseFloat(longitude), parseFloat(latitude));
        console.log(`[DEBUG] Ward Search Result: ${ward_id || 'NOT FOUND'}`);

        if (!ward_id) {
            console.error(`[DEBUG] REJECTED: Location [${longitude}, ${latitude}] outside of served wards`);
            return res.status(400).json({
                error: 'Location outside of served wards',
                received_coords: { longitude, latitude },
                hint: 'Ensure your test location is within Mumbai, Delhi, or Ranchi coordinates.'
            });
        }



        // 3. Handle Media & AI Predictions
        let imageUrl = '';
        let imageTop3 = [];
        if (imageFile) {
            imageUrl = await StorageService.uploadFile(imageFile, 'issues') || '';
            try {
                imageTop3 = await AIService.classifyImage(imageFile.buffer, imageFile.originalname);
            } catch (aiError) {
                console.error('Image Classification error:', aiError);
            }
        }

        let audioUrl = '';
        let audioText = '';
        if (audioFile) {
            audioUrl = await StorageService.uploadFile(audioFile, 'audio') || '';
            try {
                audioText = await AIService.transcribeAudio(audioFile.buffer, audioFile.originalname);
                console.log(`[AUDIO] Transcribed: "${audioText}"`);
            } catch (transError) {
                console.error('Audio Transcription error:', transError);
            }
        }

        // 4. LLM Standardization & Voice Translation (Open Source Llama 3)
        let textTop3 = [];
        try {
            textTop3 = await AIService.standardizeContent(description || '', audioText || '');
        } catch (textError) {
            console.error('Text Standardization error:', textError);
        }

        // 4.1 Execute Weighted Fusion Logic
        const fusionResult = AIService.calculateAdvancedFusion(imageTop3, [], textTop3);

        // 4.1.5 SPATIAL DEDUPLICATION (Pillar 2)
        // Check if an issue of the same category exists within its dynamic radius
        const duplicate = await SpatialService.findDuplicateIssue(
            parseFloat(latitude),
            parseFloat(longitude),
            fusionResult.finalCategory
        );

        if (duplicate) {
            console.log(`[DEDUPLICATION] Matched existing issue ${duplicate.id}. Merging...`);
            await SpatialService.handleDuplicate(duplicate, user.id, imageUrl, audioUrl);

            // Log as UPDATE
            await AuditLog.create({
                actor_id: user.id,
                event_type: 'ISSUE_UPDATED_VIA_DEDUPLICATION',
                payload: { issue_id: duplicate.id, new_reporter: user.id },
            });

            return res.status(200).json({
                success: true,
                issue_id: duplicate.id,
                message: 'Duplicate detected. Your report has been merged with an existing case to expedite resolution.',
                is_duplicate: true
            });
        }

        // 4.1.8 Auto-Routing Triage (NEW)
        const assignedDeptId = await TriageService.getDepartmentIdForCategory(fusionResult.finalCategory);
        const assignedStaffId = await TriageService.findBestStaff(assignedDeptId, ward_id);

        // 4.2 Dynamic Priority Calculation (FR 4)
        const priorityScore = await PriorityService.calculatePriority(
            user.id,
            ward_id,
            parseFloat(longitude),
            parseFloat(latitude),
            (fusionResult.fusionScore * 100) || 50, // Urgency derived from fusion confidence
            imageFile ? 80 : 50,
            fusionResult.needsHumanReview ? 'Uncertain' : 'Verified'
        );

        // 5. Create Issue with Multimodal Evidence
        const rawClass = fusionResult.finalCategory;
        const mappedCategory = AIService.getAppCategory(rawClass);

        const issue = await Issue.create({
            reporter_id: user.id,
            ward_id: ward_id,
            location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            category: mappedCategory, // User-friendly mapped category
            description: description || '',
            priority_score: priorityScore,
            status: 'Pending',
            minio_pre_key: imageUrl,
            minio_audio_key: audioUrl,
            reporter_ids: [user.id],
            minio_image_urls: imageUrl ? [imageUrl] : [],
            minio_audio_urls: audioUrl ? [audioUrl] : [],
            ai_image_top3: imageTop3,
            ai_text_top3: textTop3,
            audio_text: audioText,
            fusion_final_category: rawClass, // Store raw AI class (e.g., construction_waste)
            fusion_confidence_score: fusionResult.fusionScore,
            needs_human_review: fusionResult.needsHumanReview,
            assigned_department_id: assignedDeptId,
            assigned_staff_id: assignedStaffId
        });





        // 6. Log
        await AuditLog.create({
            actor_id: user.id,
            event_type: 'ISSUE_CREATED',
            payload: { issue_id: issue.id },
        });

        // 6.2 Check Gamification Milestones
        const reportCount = await Issue.count({ where: { reporter_id: user.id } });
        GamificationService.checkMilestones(user.id, reportCount, user.green_credits || 0);


        // 5.5 Trigger Proactive Neighborhood Alerts (Pillar 5)
        // This is non-blocking to ensure fast response to the reporter
        GeoIntelligenceService.notifyNearbyCitizens(
            issue.id,
            issue.category,
            parseFloat(latitude),
            parseFloat(longitude),
            user.id
        ).catch((err: any) => console.error('[GeoIntelligence] Proactive Alert Failed:', err));
        
        // 5.6 Notify Assigned Staff (NEW)
        if (assignedStaffId) {
            sendNotificationToUser(
                assignedStaffId,
                'New Task Assigned',
                `You have been assigned a new ${issue.category} report in ${issue.ward_id || 'your ward'}.`,
                { issue_id: issue.id, type: 'TASK_ASSIGNED' }
            ).catch((err: any) => console.error('[Triage] Staff Notification Failed:', err));
        }


        const priorityLevel = issue.priority_score > 70 ? 'High' : (issue.priority_score > 40 ? 'Medium' : 'Low');
        const confidence = (issue.fusion_confidence_score! * 100).toFixed(0);

        await sendNotificationToUser(
            user.id,
            `Issue Verified: ${issue.category}`,
            `AI verified your report with ${confidence}% confidence. Priority set to ${priorityLevel}.`,
            { issue_id: issue.id }
        );


        // 6. Trigger RAG Embedding (Background)
        RAGService.updateIssueEmbedding(issue.id).catch((err: any) => console.error('[RAG] Async update failed:', err));

        res.status(201).json({
            success: true,
            issue_id: issue.id,
            ai_summary: `AI Analysis complete: Verified as ${issue.fusion_final_category} (${(issue.fusion_confidence_score! * 100).toFixed(1)}% confidence).`
        });

    } catch (error: any) {
        console.error('CRITICAL ERROR in createIssue:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { ward_id, status, assigned_staff_id } = req.query;
        const whereClause: any = {};
        const user = req.user;
        const userRole = (user?.role || 'citizen').toLowerCase();

        // Server-Side RBAC Filtering
        if (userRole === 'staff') {
            // Staff only see their own assigned tasks
            whereClause.assigned_staff_id = user?.id;
        } else if (userRole === 'authority') {
            // Authorities only see reports in their assigned ward AND department
            if (user?.ward_id) whereClause.ward_id = user.ward_id;
            if (user?.department_id) whereClause.assigned_department_id = user.department_id;
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            // Admins can use query filters or see everything
            if (ward_id) whereClause.ward_id = ward_id;
            if (assigned_staff_id) whereClause.assigned_staff_id = assigned_staff_id;
        }
        // Citizens see everything (handled by obfuscation below)

        if (status) whereClause.status = status;

        const issues = await Issue.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });



        const isPrivileged = ['admin', 'authority', 'staff', 'super_admin'].includes(userRole);

        const transformedIssues = await Promise.all(issues.map(async (issue) => {
            const isSensitive = SENSITIVE_CATEGORIES.includes(issue.category);
            const report = issue.get();

            if (isSensitive && !isPrivileged) {
                const [lon, lat] = obfuscateLocation(report.location.coordinates[0], report.location.coordinates[1]);
                report.location = { ...report.location, coordinates: [lon, lat] };
            }

            // Generate Presigned URL for the list view
            if (report.minio_pre_key) {
                report.minio_pre_key = await StorageService.getPresignedUrl(report.minio_pre_key);
            }

            return report;
        }));

        return res.json(transformedIssues);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getReportStats = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const userRole = (user?.role || 'citizen').toLowerCase();
        let where: any = {};
        let green_credits = 0;

        // RBAC: Citizens only see their own stats, others see global/departmental
        if (userRole === 'citizen') {
            where = { reporter_id: user?.id };
            // Fetch citizen-specific info like green credits
            const dbUser = await User.findByPk(user?.id);
            if (dbUser) green_credits = dbUser.green_credits;
        } else if (userRole === 'authority') {
            // Authorities see stats for their ward/department
            const dbUser = await User.findByPk(user?.id);
            if (dbUser) {
                if (dbUser.ward_id) where.ward_id = dbUser.ward_id;
                if (dbUser.department_id) where.assigned_department_id = dbUser.department_id;
            }
        }
        // Admins and Super Admins keep where = {} for global stats

        const total = await Issue.count({ where });
        const pending = await Issue.count({ where: { ...where, status: 'Pending' } });
        const resolved = await Issue.count({ where: { ...where, status: 'Resolved' } });
        const inProgress = await Issue.count({ where: { ...where, status: 'In Progress' } });

        // Get category distribution
        const categoryCounts = await Issue.findAll({
            where,
            attributes: [
                'category',
                [sequelize.fn('COUNT', sequelize.col('category')), 'count']
            ],
            group: ['category']
        });

        const categoryData = categoryCounts.map((c: any) => ({
            name: c.category,
            value: parseInt(c.get('count'))
        }));

        res.json({
            summary: [
                { title: 'Total Issues', value: total, trend: 12, color: 'blue' },
                { title: 'Resolved', value: resolved, trend: 8, color: 'emerald' },
                { title: 'Pending', value: pending, trend: -5, color: 'rose' },
                { title: 'In Progress', value: inProgress, trend: 2, color: 'amber' },
            ],
            categoryData,
            total,
            resolved,
            green_credits,
        });
    } catch (error: any) {
        console.error('Error in getReportStats:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });
        // Apply privacy obfuscation for sensitive categories in public view
        const userRole = req.user?.role || 'citizen';
        const isSensitive = SENSITIVE_CATEGORIES.includes(issue.category);
        const isPrivileged = userRole === 'admin' || userRole === 'authority' || userRole === 'staff';

        if (isSensitive && !isPrivileged) {
            const [lon, lat] = obfuscateLocation(issue.location.coordinates[0], issue.location.coordinates[1]);
            issue.location.coordinates = [lon, lat];
        }

        // 2. Generate Presigned URLs for all media
        if (issue.minio_pre_key) issue.minio_pre_key = await StorageService.getPresignedUrl(issue.minio_pre_key);
        if (issue.minio_audio_key) issue.minio_audio_key = await StorageService.getPresignedUrl(issue.minio_audio_key);
        
        if (issue.minio_image_urls && issue.minio_image_urls.length > 0) {
            issue.minio_image_urls = await Promise.all(issue.minio_image_urls.map(url => StorageService.getPresignedUrl(url)));
        }
        
        if (issue.minio_audio_urls && issue.minio_audio_urls.length > 0) {
            issue.minio_audio_urls = await Promise.all(issue.minio_audio_urls.map(url => StorageService.getPresignedUrl(url)));
        }

        res.json(issue);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateReport = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, category, priority_score, assigned_staff_id } = req.body;

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (status) issue.status = status;
        if (category && issue.category !== category) {
            // Discrepancy detected: Log to AI Retraining Queue
            try {
                await AIFeedback.create({
                    issue_id: issue.id,
                    original_category: issue.category,
                    corrected_category: category,
                    media_url: (issue.minio_image_urls && issue.minio_image_urls.length > 0) ? issue.minio_image_urls[0] : (issue.minio_pre_key || null)
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

        res.json({ success: true, issue });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkUpdateReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { ids, status, category } = req.body;
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        
        if (userRole !== 'admin' && userRole !== 'authority' && userRole !== 'super_admin') {
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
        await AuditLog.create({
            actor_id: req.user?.id,
            event_type: 'BULK_UPDATE',
            payload: { 
                ids, 
                updates: updateData,
                count
            },
        });

        res.json({ success: true, message: `Successfully updated ${count} reports`, count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const askCivicAI = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const answer = await RAGService.generateExecutiveSummary(query);
        res.json({ answer });
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

        // 2. Perform MinIO Storage Cleanup
        const bucketName = StorageService.getBucketName();
        const mediaUrls = [
            ...(issue.minio_image_urls || []),
            ...(issue.minio_audio_urls || [])
        ];

        console.log(`[CLEANUP] Initiating storage purge for Issue ${issueId}. Found ${mediaUrls.length} media items.`);

        for (const url of mediaUrls) {
            try {
                // The URL structure is: protocol://host:port/bucketName/objectKey
                const urlParts = url.split(`${bucketName}/`);
                if (urlParts.length > 1) {
                    const objectKey = urlParts[1] as string;
                    console.log(`[CLEANUP] Purging MinIO object: ${objectKey}`);
                    await StorageService.deleteFile(objectKey);
                }
            } catch (storageErr) {
                console.error(`[CLEANUP] Non-fatal: Failed to delete media [${url}] from MinIO:`, storageErr);
            }
        }

        // 3. Destroy the Database Record
        await issue.destroy();

        // 4. Log the Deletion Activity
        await AuditLog.create({
            actor_id: (req as any).user?.id || 'SYSTEM',
            event_type: 'ISSUE_DELETED',
            payload: { issue_id: issueId, category: issue.category },
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

export const getNearbyReports = async (req: AuthRequest, res: Response) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;
        if (!latitude || !longitude) return res.status(400).json({ error: 'Coordinates missing' });

        const lat = parseFloat(latitude as string);
        const lon = parseFloat(longitude as string);
        const rad = parseFloat(radius as string);

        const issues = await Issue.findAll({
            where: sequelize.where(
                sequelize.fn('ST_DistanceSphere', sequelize.col('location'), sequelize.fn('ST_MakePoint', lon, lat)),
                { [Op.lte]: rad }
            ),
            order: [[sequelize.fn('ST_DistanceSphere', sequelize.col('location'), sequelize.fn('ST_MakePoint', lon, lat)), 'ASC']]
        });

        res.json(issues);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const proposeResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const file = req.files?.['image']?.[0] || req.files?.[0];
        const phone = req.userIdentifier;
        const user = await User.findOne({ where: { phone } });
        if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ error: 'Access denied. Only assigned staff can propose resolution.' });
        }

        if (!file) return res.status(400).json({ error: 'Resolution image required' });

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        // Ensure the staff member is the one assigned (unless admin)
        if (user.role === 'staff' && issue.assigned_staff_id !== user.id) {
            return res.status(403).json({ error: 'Access denied. You are not assigned to this issue.' });
        }

        const imageUrl = await StorageService.uploadFile(file, 'repairs') || '';


        await Repair.create({
            issue_id: issue.id,
            worker_id: user.id,
            minio_post_key: imageUrl,
        });

        // 3. Update Issue Status to Pending Confirmation
        issue.status = 'Pending Confirmation';
        await issue.save();

        // 4. Log the submission
        await AuditLog.create({
            actor_id: user.id,
            event_type: 'RESOLUTION_SUBMITTED',
            payload: { issue_id: issue.id, repair_image: imageUrl },
        });

        // 5. Notify Authorities for approval
        broadcastNotification(
            `authority_${issue.assigned_department_id}`, 
            'New Resolution to Approve',
            `Staff ${user.phone || ''} has submitted work for issue ${issue.id.slice(0, 8)}.`,
            { issue_id: issue.id, type: 'APPROVAL_REQUIRED' }
        ).catch((err: any) => console.error('[Notification] Authority notify failed:', err));

        // 6. Notify the reporter
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

export const confirmResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const userAuth = (req as any).user;

        // 1. Role Check: Only Authority or Admin can confirm
        if (!userAuth || !['authority', 'admin', 'super_admin'].includes(userAuth.role)) {
            return res.status(403).json({ error: 'Access denied. Only authorities can approve resolutions.' });
        }

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (issue.status !== 'Pending Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting confirmation' });
        }

        // 2. Advance to Dual-Verification (Citizen's turn)
        issue.status = 'Pending Citizen Confirmation';
        await issue.save();

        // 3. Log Authority Approval
        await AuditLog.create({
            actor_id: userAuth.id,
            event_type: 'AUTHORITY_RESOLUTION_APPROVED',
            payload: { issue_id: issue.id },
        });

        // 4. Notify ALL Reporters to verify
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

        // 1. Role Check: Only Authority or Admin can reject
        if (!userAuth || !['authority', 'admin', 'super_admin'].includes(userAuth.role)) {
            return res.status(403).json({ error: 'Access denied. Only authorities can reject resolutions.' });
        }

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (issue.status !== 'Pending Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting confirmation' });
        }

        // 2. Revert to In Progress
        issue.status = 'In Progress';
        await issue.save();

        // 3. Log Rejection
        await AuditLog.create({
            actor_id: userAuth.id,
            event_type: 'RESOLUTION_REJECTED',
            payload: { issue_id: issue.id, reason: reason || 'Quality of work not satisfactory' },
        });

        // 4. Notify Staff
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

export const citizenConfirmResolution = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const userAuth = (req as any).user;

        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        // 1. Verify this user is the reporter (or one of the reporters)
        const reporterIds = issue.reporter_ids || [issue.reporter_id];
        if (!userAuth || !reporterIds.includes(userAuth.id)) {
            return res.status(403).json({ error: 'Access denied. Only the original reporter can verify the resolution.' });
        }

        if (issue.status !== 'Pending Citizen Confirmation') {
            return res.status(400).json({ error: 'Issue is not awaiting citizen confirmation' });
        }

        // 2. Finalize Issue
        issue.status = 'Resolved';
        await issue.save();

        // 3. Close the repair record
        const repair = await Repair.findOne({ where: { issue_id: issue.id }, order: [['createdAt', 'DESC']] });
        if (repair) {
            repair.closed_at = new Date();
            await repair.save();
        }

        // 4. Calculate & Award Credits
        const baseCredits = GamificationService.calculateCredits(issue.priority_score, !!issue.minio_pre_key, !!issue.minio_audio_key);
        const bonusCredits = 20; // Bonus for verifying
        const totalAwarded = baseCredits + bonusCredits;

        for (const rId of reporterIds) {
            await GamificationService.addCredits(rId as string, totalAwarded, 'RESOLVED_AND_VERIFIED');
            
            // Check milestones
            const rUser = await User.findByPk(rId);
            const rReportCount = await Issue.count({ where: { reporter_id: rId as string } });
            // For simplicity, we'll assume a verificationCount can be derived or tracked. 
            // For now, let's just pass 0 or a fixed value.
            if (rUser) {
                GamificationService.checkMilestones(rId as string, rReportCount, rUser.green_credits, 1);
            }
        }

        // 5. Log & Notify
        await AuditLog.create({
            actor_id: userAuth.id,
            event_type: 'CITIZEN_RESOLUTION_VERIFIED',
            payload: { issue_id: issue.id, credits: totalAwarded },
        });

        // 6. Notify Staff
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

        await AuditLog.create({
            actor_id: userAuth.id,
            event_type: 'CITIZEN_RESOLUTION_DISPUTED',
            payload: { issue_id: issue.id, reason },
        });

        // Notify Authority & Staff
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

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const logs = await AuditLog.findAll({
            where: { payload: { issue_id: id } },
            order: [['createdAt', 'DESC']],
        });

        res.json(logs);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getGeoJSONReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { status } = req.query;
        const userRole = req.user?.role || 'citizen'; // Assuming req.user is populated by auth middleware

        let whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        // Fetch raw issue data
        const issues = await Issue.findAll({
            where: whereClause,
            attributes: [
                'id', 'category', 'status', 'priority_score', 'description', 'image_url',
                'reporter_id', 'assigned_staff_id', 'createdAt', 'updatedAt',
                [sequelize.fn('ST_AsGeoJSON', sequelize.col('location')), 'location_geojson']
            ],
            raw: true, // Get raw data to easily manipulate
        });

        // Transform to GeoJSON and obfuscate if sensitive
        const features = issues.map((issue: any) => {
            let geometry = JSON.parse(issue.location_geojson);
            let coords = geometry.coordinates;

            // Apply privacy obfuscation for sensitive categories in public view
            const isSensitive = SENSITIVE_CATEGORIES.includes(issue.category);
            const isPrivileged = userRole === 'admin' || userRole === 'authority' || userRole === 'staff';

            if (isSensitive && !isPrivileged) {
                coords = obfuscateLocation(coords[0], coords[1]);
                geometry.coordinates = coords;
            }

            // Remove the raw geojson string and add the processed geometry
            const properties = { ...issue };
            delete properties.location_geojson;

            return {
                type: 'Feature',
                geometry: geometry,
                properties: properties
            };
        });

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        res.json(geojson);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAuthorityKPIs = async (_req: AuthRequest, res: Response): Promise<any> => {
    try {
        const total = await Issue.count();
        const resolved = await Issue.count({ where: { status: 'Resolved' } });
        const pending = await Issue.count({ where: { status: 'Pending' } });

        res.json({
            totalIssues: total,
            resolvedCount: resolved,
            pendingCount: pending,
            slaCompliance: 85,
            satisfactionScore: 4.5
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getRetrainingQueue = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        const isPrivileged = userRole === 'admin' || userRole === 'authority' || userRole === 'staff' || userRole === 'super_admin';

        if (!isPrivileged) return res.status(403).json({ error: 'Access denied. You must be an admin or staff member.' });

        const queue = await AIFeedback.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.json(queue);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateFeedbackStatus = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';

        if (!isAdmin) return res.status(403).json({ error: 'Access denied. Only administrators can update retraining status.' });

        const { id } = req.params;
        const { status } = req.body; // 'Processed' or 'Dismissed'

        const feedback = await AIFeedback.findByPk(id as string);
        if (!feedback) return res.status(404).json({ error: 'Feedback entry not found' });

        await feedback.update({ status: status || 'Processed' });
        
        // Log the administrative action
        await AuditLog.create({
            id: uuidv4(),
            issue_id: feedback.issue_id,
            action: `AI_FEEDBACK_${(status || 'PROCESSED').toUpperCase()}`,
            actor_id: req.user?.id,
            details: { feedback_id: id, new_status: status }
        });

        res.json({ message: `Feedback status updated to ${status}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const exportRetrainingData = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const data = await AIFeedback.findAll({
            where: { status: 'Processed' },
            order: [['updatedAt', 'DESC']]
        });

        // Map to a format suitable for Python training scripts
        const dataset = data.map(f => ({
            id: f.id,
            image_url: f.media_url,
            original_prediction: f.original_category,
            correct_label: f.corrected_category,
            verified_at: f.updatedAt
        }));

        res.json({
            count: dataset.length,
            generated_at: new Date().toISOString(),
            dataset
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
export const testAudioPrediction = async (req: AuthRequest, res: Response) => {
    try {
        const file = (req as any).file || (req as any).files?.['audio']?.[0] || (req as any).files?.[0];
        if (!file) return res.status(400).json({ error: 'Audio file required' });

        const transcription = await AIService.transcribeAudio(file.buffer, file.originalname);
        const categories = await AIService.standardizeContent('', transcription);

        res.json({
            success: true,
            transcription,
            predicted_categories: categories
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
