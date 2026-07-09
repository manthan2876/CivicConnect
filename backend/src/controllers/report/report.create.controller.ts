import type { Request, Response } from 'express';
import axios from 'axios';
import { User, Issue, ProcessingJob } from '../../config/db.js';
import { StorageService } from '../../services/storageService.js';
import { AuditService } from '../../services/auditService.js';
import { findWardId } from '../../utils/spatialUtils.js';
import { AIService } from '../../services/aiService.js';
import type { AuthRequest } from './report.utils.js';
import { getS3KeyFromUrl } from './report.utils.js';

export const createReport = async (req: AuthRequest, res: Response) => {
    console.log('--- Incoming Async AI-Enhanced Issue Request ---');
    const files = req.files;
    const imageFile = files?.['image']?.[0] || req.file;
    const audioFile = files?.['audio']?.[0];

    try {
        const { description, latitude, longitude, imageKey: bodyImageKey, audioKey: bodyAudioKey } = req.body;
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
                hint: 'Ensure your test location is within Mumbai, Delhi, Ranchi, or Gujarat coordinates.'
            });
        }

        // 3. Resolve S3 Keys and URLs
        let imageKey = bodyImageKey || '';
        let imageUrl = '';
        const bucketName = StorageService.getBucketName();

        if (imageFile) {
            imageUrl = await StorageService.uploadFile(imageFile, 'issues') || '';
            imageKey = getS3KeyFromUrl(imageUrl, bucketName);
        } else if (imageKey) {
            imageUrl = await StorageService.getPresignedUrl(imageKey);
        }

        let audioKey = bodyAudioKey || '';
        let audioUrl = '';
        if (audioFile) {
            audioUrl = await StorageService.uploadFile(audioFile, 'audio') || '';
            audioKey = getS3KeyFromUrl(audioUrl, bucketName);
        } else if (audioKey) {
            audioUrl = await StorageService.getPresignedUrl(audioKey);
        }

        // Generate short-lived presigned GET URLs for the AI classifier to access
        const imageGetUrl = imageKey ? await StorageService.getPresignedUrl(imageKey) : '';
        const audioGetUrl = audioKey ? await StorageService.getPresignedUrl(audioKey) : '';

        // 4. Create Issue (Pending AI classification)
        const issue = await Issue.create({
            reporter_id: user.id,
            ward_id: ward_id,
            location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            category: 'Other', // Temporary category
            description: description || '',
            priority_score: 0, // Will be computed by Edge function
            status: 'Pending',
            s3_pre_key: imageUrl || null,
            s3_audio_key: audioUrl || null,
            reporter_ids: [user.id],
            s3_image_urls: imageUrl ? [imageUrl] : [],
            s3_audio_urls: audioUrl ? [audioUrl] : [],
            ai_image_top3: [],
            ai_audio_top3: [],
            ai_text_top3: [],
            audio_text: '',
            fusion_final_category: 'processing', // Temporary marker
            fusion_confidence_score: 0,
            needs_human_review: false,
            assigned_department_id: null,
            assigned_staff_id: null
        });

        // 5. Create Processing Job entry
        const job = await ProcessingJob.create({
            issue_id: issue.id,
            image_s3_key: imageKey || null,
            image_get_url: imageGetUrl || null,
            audio_s3_key: audioKey || null,
            audio_get_url: audioGetUrl || null,
            description: description || null,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            reporter_id: user.id,
            ward_id: ward_id,
            status: 'pending',
            attempts: 0
        });

        // Log the event
        AuditService.log({
            actor_id: user.id,
            event_type: 'report.created_async',
            target_resource: 'issue',
            target_resource_id: issue.id,
            new_value: { category: issue.category, status: issue.status, ward_id: issue.ward_id },
            payload: { description: issue.description?.slice(0, 120), job_id: job.id },
        });

        // Trigger the Supabase Edge Function in the background
        const triggerUrl = `${process.env.SUPABASE_URL}/functions/v1/classify-report`;
        console.log(`[TRIGGER] Invoking Supabase Edge Function at: ${triggerUrl} for Job ID: ${job.id}`);
        axios.post(triggerUrl, { job_id: job.id }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
            }
        }).catch((err: any) => {
            console.error('[TRIGGER] Supabase Edge Function invocation failed:', err.message);
        });

        return res.status(201).json({
            success: true,
            issue_id: issue.id,
            job_id: job.id
        });

    } catch (error: any) {
        console.error('CRITICAL ERROR in createReport (async):', error);
        res.status(500).json({ error: error.message });
    }
};

export const getJobStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const { job_id } = req.params;
        if (typeof job_id !== 'string') {
            return res.status(400).json({ error: 'Invalid Job ID' });
        }
        const job = await ProcessingJob.findByPk(job_id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        return res.json({
            status: job.status,
            issue_id: job.issue_id,
            result: job.result,
            error: job.error
        });
    } catch (error: any) {
        console.error('Error fetching job status:', error);
        return res.status(500).json({ error: 'Failed to get job status' });
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
