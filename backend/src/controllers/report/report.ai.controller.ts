import type { Response } from 'express';
import { AIFeedback } from '../../config/db.js';
import { RAGService } from '../../services/ragService.js';
import { AuditService } from '../../services/auditService.js';
import type { AuthRequest } from './report.utils.js';

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

export const getRetrainingQueue = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const permissions: string[] = req.user?.permissions || [];

        if (!permissions.includes('ai:manage')) return res.status(403).json({ error: 'Access denied. You must be an admin or staff member.' });

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
        const permissions: string[] = req.user?.permissions || [];

        if (!permissions.includes('ai:manage')) return res.status(403).json({ error: 'Access denied. Only administrators can update retraining status.' });

        const { id } = req.params;
        const { status } = req.body; // 'Processed' or 'Dismissed'

        const feedback = await AIFeedback.findByPk(id as string);
        if (!feedback) return res.status(404).json({ error: 'Feedback entry not found' });

        await feedback.update({ status: status || 'Processed' });
        
        // Log the administrative action
        AuditService.log({
            actor_id: req.user?.id || 'SYSTEM',
            event_type: `ai.feedback_${(status || 'processed').toLowerCase()}`,
            target_resource: 'ai_feedback',
            target_resource_id: id as string,
            payload: { issue_id: feedback.issue_id, feedback_id: id, new_status: status }
        });

        res.json({ message: `Feedback status updated to ${status}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const exportRetrainingData = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const permissions: string[] = req.user?.permissions || [];
        if (!permissions.includes('ai:manage')) {
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
