import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Issue } from '../models/Issue.js';
import { AIService } from '../services/aiService.js';
import { TriageService } from '../services/triageService.js';
import { PriorityService } from '../services/priorityService.js';

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
    try {
        const { From, Body, MediaUrl0, Latitude, Longitude } = req.body;
        const phone = From.replace('whatsapp:', '');

        // 1. Find or Create User
        let user = await User.findOne({ where: { phone } });
        if (!user) {
            user = await User.create({
                phone,
                role: 'citizen'
            });
        }

        // 2. Process Media if exists
        let imageUrl = null;
        if (MediaUrl0) {
            // In a real scenario, we'd download from Twilio and upload to MinIO
            // For mock/demo, we'll assume the URL is usable or just log it
            console.log(`[WhatsApp] Received Media: ${MediaUrl0}`);
            imageUrl = MediaUrl0; 
        }

        // 3. AI Analysis
        const description = Body || 'WhatsApp Report';
        const aiResult = await AIService.analyzeMultimodal(
            imageUrl, 
            null, // No audio for now
            description
        );

        // 4. Triage & Priority
        const ward_id = 'DEFAULT_WARD'; // In a real app, we'd reverse geocode Lat/Lon
        const assignedDeptId = await TriageService.getDepartmentIdForCategory(aiResult.finalCategory);
        const assignedStaffId = await TriageService.findBestStaff(assignedDeptId, ward_id);

        const priorityScore = await PriorityService.calculatePriority(
            user.id,
            ward_id,
            parseFloat(Longitude || '0'),
            parseFloat(Latitude || '0'),
            aiResult.fusionScore * 100,
            imageUrl ? 80 : 50,
            'Unverified'
        );

        // 5. Create Issue
        const issue = await Issue.create({
            reporter_id: user.id,
            ward_id: ward_id,
            location: { 
                type: 'Point', 
                coordinates: [parseFloat(Longitude || '0'), parseFloat(Latitude || '0')] 
            },
            category: AIService.getAppCategory(aiResult.finalCategory),
            description: description,
            priority_score: priorityScore,
            status: 'Pending',
            minio_pre_key: imageUrl,
            fusion_final_category: aiResult.finalCategory,
            fusion_confidence_score: aiResult.fusionScore,
            assigned_department_id: assignedDeptId,
            assigned_staff_id: assignedStaffId,
            reporter_ids: [user.id]
        });

        // 6. Respond to WhatsApp (Twilio XML format)
        res.type('text/xml');
        res.send(`
            <Response>
                <Message>
                    Hello citizen (${user.phone})! 
                    Thank you for reporting this issue. 
                    We've identified it as "${issue.category}" with a priority score of ${priorityScore.toFixed(0)}.
                    Reference ID: ${issue.id.slice(0, 8)}
                </Message>
            </Response>
        `);

    } catch (error: any) {
        console.error('[WhatsApp Webhook Error]', error);
        res.status(500).send('<Response><Message>Sorry, something went wrong with your report.</Message></Response>');
    }
};
