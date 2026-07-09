import type { Request, Response } from 'express';
import { User } from '../config/db.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            return res.status(401).json({ message: error?.message || 'Invalid email or password' });
        }

        // Fetch/Sync profile in PostgreSQL
        const identifier = data.user.phone || data.user.email;
        const { Op } = require('sequelize');
        let user = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { id: data.user.id },
                    { phone: identifier },
                    { email: identifier }
                ]
            } 
        });
        
        if (!user) {
            user = await User.create({ 
                id: data.user.id,
                phone: data.user.phone || null,
                email: data.user.email || null,
                role: data.user.user_metadata?.role || 'citizen'
            });
        }

        res.status(200).json({
            id: data.user.id,
            token: data.session?.access_token,
            user: {
                id: user.id,
                phone: user.phone,
                green_credits: user.green_credits,
                role: data.user.user_metadata?.role || 'Citizen',
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { phone, password, role } = req.body;

        // Register in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            phone,
            password,
            options: {
                data: { role: role || 'Citizen' }
            }
        });

        if (error || !data.user) {
            return res.status(400).json({ message: error?.message || 'Registration failed' });
        }

        // Create in PostgreSQL
        const user = await User.create({ phone });

        res.status(201).json({
            id: user.id,
            phone: user.phone,
            role: role || 'Citizen'
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { ward_id } = req.body;

        const user = await User.findByPk(id as string);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (ward_id) user.ward_id = ward_id;
        await user.save();

        res.status(200).json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    console.log(`[DEBUG] changePassword controller reached for user: ${(req as any).user?.id}`);
    try {
        const { currentPassword, newPassword } = req.body;
        const user = (req as any).user;

        if (!currentPassword) {
            return res.status(400).json({ message: 'currentPassword is required' });
        }
        if (!newPassword) {
            return res.status(400).json({ message: 'newPassword is required' });
        }

        // 1. Verify current password by re-authenticating
        const identifier = user.email || user.phone;
        if (!identifier) {
            return res.status(400).json({ message: 'User identifier (email/phone) not found on token' });
        }

        const signInParams: any = { password: currentPassword };
        if (user.email) signInParams.email = user.email;
        else signInParams.phone = user.phone;

        const { error: signInError } = await supabase.auth.signInWithPassword(signInParams);

        if (signInError) {
            console.error('[Auth] Password verification failed:', signInError.message);
            return res.status(401).json({ message: 'The current password you entered is incorrect.' });
        }

        // 2. Update to new password using Service Role (Admin)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error('[Auth] updateUserById failed:', updateError.message);
            return res.status(400).json({ message: updateError.message });
        }

        // 3. Clear temp password from PostgreSQL now that the user has set their own
        try {
            const dbUser = await User.findByPk(user.id);
            if (dbUser && dbUser.temp_password_cleartext) {
                dbUser.temp_password_cleartext = null;
                await dbUser.save();
                console.log(`[Auth] Cleared temp_password_cleartext for user ${user.id}`);
            }
        } catch (clearErr: any) {
            // Non-fatal: log but don't fail the response
            console.error('[Auth] Failed to clear temp password:', clearErr.message);
        }

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('[Auth] changePassword crash:', error.message);
        res.status(500).json({ message: error.message });
    }
};

