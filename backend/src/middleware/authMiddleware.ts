import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { syncUserFromDatabase } from '../utils/authUtils.js';

export const verifySupabaseToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Use the anon client to verify the token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('[AuthMiddleware] JWT Verification Failed:', error?.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const { dbUser, userRoleName, attachedPermissions } = await syncUserFromDatabase(user);

        (req as any).user = {
            ...user,
            role: userRoleName,
            permissions: attachedPermissions,
            department_id: dbUser?.department_id,
            ward_id: dbUser?.ward_id,
            ulb_id: dbUser?.ulb_id
        };
        
        (req as any).userIdentifier = user.phone || user.email || user.id;

        next();
    } catch (error: any) {
        console.error('[AuthMiddleware] Internal Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};
