import type { Response } from 'express';
import { User } from '../../config/db.js';
import { StorageService } from '../../services/storageService.js';
import { supabaseAdmin } from '../../config/supabase.js';
import type { AuthRequest } from './user.utils.js';

export const updateUserAvatar = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Upload the file to S3 using the StorageService (which maps to AWS S3)
        const presignedUrl = await StorageService.uploadFile(req.file, 'avatars');
        if (!presignedUrl) {
            return res.status(500).json({ error: 'Failed to upload image to S3' });
        }

        // Extract clean S3 key from the presigned URL to store in Postgres
        let s3Key = presignedUrl;
        const bucketName = StorageService.getBucketName();
        if (presignedUrl.includes(bucketName)) {
            const parts = presignedUrl.split(`${bucketName}/`);
            if (parts.length > 1 && parts[1]) {
                s3Key = parts[1].split('?')[0] || '';
            }
        }

        // 1. Update avatar_url in PostgreSQL
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.avatar_url = s3Key;
        await user.save();

        // Generate a fresh presigned URL valid for 24 hours
        const freshPresignedUrl = await StorageService.getPresignedUrl(s3Key);

        // 2. Update avatar_url in Supabase Auth user metadata
        const userMetadata = req.user?.user_metadata || {};
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                user_metadata: {
                    ...userMetadata,
                    avatar_url: freshPresignedUrl
                }
            }
        );

        if (metadataError) {
            console.error('[AvatarController] Error updating Supabase user metadata:', metadataError.message);
        }

        return res.json({
            success: true,
            avatar_url: freshPresignedUrl
        });
    } catch (error: any) {
        console.error('[AvatarController] Internal Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
