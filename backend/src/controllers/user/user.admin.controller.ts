import type { Response } from 'express';
import { User, Department, Ward, Role, UserRole } from '../../config/db.js';
import { AuditService } from '../../services/auditService.js';
import { supabaseAdmin } from '../../config/supabase.js';
import type { AuthRequest } from './user.utils.js';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.findAll({
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: Ward, as: 'ward', attributes: ['id', 'name'] }
            ]
        });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getStaff = async (req: AuthRequest, res: Response) => {
    try {
        const { ward_id, department_id } = req.query;
        const where: any = { role: 'staff' };

        if (ward_id) where.ward_id = ward_id;
        if (department_id) where.department_id = department_id;

        const staff = await User.findAll({
            where,
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: Ward, as: 'ward', attributes: ['id', 'name'] }
            ]
        });

        res.json(staff);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const creator = req.user;
        const { name, email, role, phone, designation, department_id, ward_id } = req.body;
        let ulb_id = req.body.ulb_id;

        // If local City Admin, restrict ulb_id to their own city
        if (creator && creator.role !== 'super_admin') {
            ulb_id = creator.ulb_id;
        }

        if (!email || !role || !name) {
            return res.status(400).json({ error: 'Name, email, and role are required.' });
        }

        // Generate temporary password complying with strict complexity rules (at least 1 upper, 1 lower, 1 digit, 1 special)
        const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowers = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let generatedPassword = '';
        generatedPassword += uppers.charAt(Math.floor(Math.random() * uppers.length));
        generatedPassword += lowers.charAt(Math.floor(Math.random() * lowers.length));
        generatedPassword += digits.charAt(Math.floor(Math.random() * digits.length));
        generatedPassword += specials.charAt(Math.floor(Math.random() * specials.length));
        const allChars = uppers + lowers + digits + specials;
        for (let i = 4; i < 12; i++) {
            generatedPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

        console.log(`[UserController] Creating Supabase Auth account for: ${email}`);
        const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
                role,
                name,
                designation
            }
        });

        if (error || !supabaseUser) {
            console.error('[UserController] Supabase creation failed:', error?.message);
            return res.status(400).json({ error: error?.message || 'Failed to create user in Auth provider.' });
        }

        console.log(`[UserController] Supabase Auth account created (ID: ${supabaseUser.id}). Syncing to PG...`);
        
        let newUser;
        try {
            // Sync to Postgres users table
            newUser = await User.create({
                id: supabaseUser.id,
                email,
                phone: phone || null,
                role,
                designation: designation || null,
                department_id: department_id || null,
                ward_id: ward_id || null,
                ulb_id: ulb_id || null,
                temp_password_cleartext: generatedPassword,
                green_credits: 100,
                is_active: true
            });

            // Link Role in user_roles
            let mappedRole = role.toLowerCase();
            if (mappedRole === 'staff') mappedRole = 'field_officer';
            else if (mappedRole === 'authority') mappedRole = 'dept_head';

            const dbRole = await Role.findOne({ where: { name: mappedRole } });
            if (dbRole) {
                await UserRole.create({
                    user_id: supabaseUser.id,
                    role_id: dbRole.id
                });
            }
        } catch (dbErr: any) {
            console.error('[UserController] PostgreSQL Sync failed, rolling back Supabase user:', dbErr.message);
            // Rollback Supabase user creation to keep auth & DB state consistent
            await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id).catch(rollErr => {
                console.error('[UserController] Failed to rollback Supabase user:', rollErr.message);
            });
            throw dbErr;
        }

        // Log Audit Event
        AuditService.log({
            actor_id: creator?.id || 'SYSTEM',
            event_type: 'user.created',
            target_resource: 'user',
            target_resource_id: supabaseUser.id,
            new_value: { email, role, name }
        });

        res.status(201).json({
            ...newUser.toJSON(),
            temp_password_cleartext: generatedPassword
        });
    } catch (error: any) {
        console.error('[UserController] createUser Failed:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            const fields = error.errors.map((e: any) => e.path).join(', ');
            return res.status(409).json({ error: `A user with this ${fields} already exists.` });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const creator = req.user;
        const { id } = req.params;

        const user = await User.findByPk(id as string);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Scoping check: City Admin can only reset their own city's users
        if (creator && creator.role !== 'super_admin' && user.ulb_id !== creator.ulb_id) {
            return res.status(403).json({ error: 'Forbidden: Cannot reset password for users in another city.' });
        }

        // Generate new password complying with strict complexity rules (at least 1 upper, 1 lower, 1 digit, 1 special)
        const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowers = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let generatedPassword = '';
        generatedPassword += uppers.charAt(Math.floor(Math.random() * uppers.length));
        generatedPassword += lowers.charAt(Math.floor(Math.random() * lowers.length));
        generatedPassword += digits.charAt(Math.floor(Math.random() * digits.length));
        generatedPassword += specials.charAt(Math.floor(Math.random() * specials.length));
        const allChars = uppers + lowers + digits + specials;
        for (let i = 4; i < 12; i++) {
            generatedPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

        console.log(`[UserController] Resetting password in Supabase for user ${id}`);
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id as string, {
            password: generatedPassword
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Save new cleartext password to PG
        user.temp_password_cleartext = generatedPassword;
        await user.save();

        // Log Audit Event
        AuditService.log({
            actor_id: creator?.id || 'SYSTEM',
            event_type: 'user.password_reset',
            target_resource: 'user',
            target_resource_id: id as string,
            payload: { message: `Password reset by Admin: ${creator?.email || 'Unknown'}` }
        });

        res.json({ success: true, temp_password_cleartext: generatedPassword });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
