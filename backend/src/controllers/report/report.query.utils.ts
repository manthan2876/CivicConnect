import { Op } from 'sequelize';
import { Ward, User } from '../../config/db.js';

export const buildReportsWhereClause = async (user: any, query: any): Promise<any> => {
    const { ward_id, status, assigned_staff_id } = query;
    const whereClause: any = {};
    const userRole = (user?.role || 'citizen').toLowerCase();
    const permissions: string[] = user?.permissions || [];
    const cityScopedRoles = ['admin', 'mayor'];

    if (cityScopedRoles.includes(userRole) && user?.ulb_id) {
        const cityWards = await Ward.findAll({ where: { ulb_id: user.ulb_id }, attributes: ['id'] });
        const cityWardIds = cityWards.map((w: any) => w.id);
        whereClause.ward_id = { [Op.in]: cityWardIds };
        if (ward_id && cityWardIds.includes(ward_id as string)) {
            whereClause.ward_id = ward_id;
        }
        if (assigned_staff_id) whereClause.assigned_staff_id = assigned_staff_id;
    } else if (permissions.includes('report:view_all')) {
        if (ward_id) whereClause.ward_id = ward_id;
        if (assigned_staff_id) whereClause.assigned_staff_id = assigned_staff_id;
        if (userRole === 'dept_head' || userRole === 'authority') {
            // dept_head sees all issues in their ward + department
            if (user?.ward_id) whereClause.ward_id = user.ward_id;
            if (user?.department_id) whereClause.assigned_department_id = user.department_id;
        } else if (userRole === 'field_officer') {
            // field_officer (zone authority) sees all issues in their ward
            if (user?.ward_id) whereClause.ward_id = user.ward_id;
        } else if (userRole === 'staff') {
            // ground staff: only see their own assigned tasks
            whereClause.assigned_staff_id = user?.id;
        }
    } else if (userRole === 'citizen' || userRole === 'viewer') {
        // Citizens always see their own submitted reports.
        // If they have a ward_id, also include reports from their area.
        const reporterCondition = { [Op.or]: [
            { reporter_id: user?.id },
            { reporter_ids: { [Op.contains]: [user?.id] } }
        ]};
        if (user?.ward_id) {
            whereClause[Op.or] = [
                { ward_id: user.ward_id },
                reporterCondition[Op.or]
            ];
        } else {
            // No ward set: only show their own reports
            whereClause[Op.or] = reporterCondition[Op.or];
        }
    } else if (permissions.includes('report:view_area')) {
        if (user?.ward_id) {
            whereClause.ward_id = user.ward_id;
        } else {
            whereClause.ward_id = '00000000-0000-0000-0000-000000000000';
        }
    } else if (permissions.includes('report:view_my')) {
        whereClause.reporter_id = user?.id;
    } else {
        whereClause.id = '00000000-0000-0000-0000-000000000000';
    }

    if (status) whereClause.status = status;
    return whereClause;
};

export const buildStatsWhereClause = async (user: any): Promise<any> => {
    const userRole = (user?.role || 'citizen').toLowerCase();
    const whereClause: any = {};
    const permissions: string[] = user?.permissions || [];

    if (permissions.includes('report:view_all') || ['admin', 'mayor'].includes(userRole)) {
        const dbUser = await User.findByPk(user?.id);
        if (dbUser) {
            const cityScopedRoles = ['admin', 'mayor'];
            if (cityScopedRoles.includes(userRole) && dbUser.ulb_id) {
                const cityWards = await Ward.findAll({ where: { ulb_id: dbUser.ulb_id }, attributes: ['id'] });
                whereClause.ward_id = { [Op.in]: cityWards.map((w: any) => w.id) };
            } else if (userRole === 'dept_head' || userRole === 'authority') {
                if (dbUser.ward_id) whereClause.ward_id = dbUser.ward_id;
                if (dbUser.department_id) whereClause.assigned_department_id = dbUser.department_id;
            } else if (userRole === 'field_officer') {
                // field_officer sees all issues in their ward
                if (dbUser.ward_id) whereClause.ward_id = dbUser.ward_id;
            } else if (userRole === 'staff') {
                whereClause.assigned_staff_id = user?.id;
            }
        }
    } else if (userRole === 'citizen' || userRole === 'viewer') {
        // Citizens always see their own submitted reports
        whereClause[Op.or] = [
            { reporter_id: user?.id },
            { reporter_ids: { [Op.contains]: [user?.id] } }
        ];
    } else if (permissions.includes('report:view_area')) {
        const dbUser = await User.findByPk(user?.id);
        if (dbUser && dbUser.ward_id) {
            whereClause.ward_id = dbUser.ward_id;
        } else {
            whereClause.ward_id = '00000000-0000-0000-0000-000000000000';
        }
    } else {
        whereClause.reporter_id = user?.id;
    }

    return whereClause;
};

export const buildGeoJSONWhereClause = async (user: any, status: any): Promise<any> => {
    const userRole = (user?.role || 'citizen').toLowerCase();
    const whereClause: any = {};
    if (status) {
        whereClause.status = status;
    }

    const cityScopedRoles = ['admin', 'mayor'];
    if (cityScopedRoles.includes(userRole) && user?.ulb_id) {
        const cityWards = await Ward.findAll({ where: { ulb_id: user.ulb_id }, attributes: ['id'] });
        whereClause.ward_id = { [Op.in]: cityWards.map((w: any) => w.id) };
    } else if (userRole === 'field_officer') {
        if (user?.ward_id) whereClause.ward_id = user.ward_id;
    } else if (userRole === 'staff') {
        whereClause.assigned_staff_id = user?.id;
    } else if (userRole === 'dept_head' || userRole === 'authority') {
        if (user?.ward_id) whereClause.ward_id = user.ward_id;
        if (user?.department_id) whereClause.assigned_department_id = user.department_id;
    } else if (userRole === 'citizen' || userRole === 'viewer') {
        // Citizens see their own submitted reports on the map
        whereClause[Op.or] = [
            { reporter_id: user?.id },
            { reporter_ids: { [Op.contains]: [user?.id] } }
        ];
    } else if (userRole === 'councilor' && user?.ward_id) {
        whereClause.ward_id = user.ward_id;
    }

    return whereClause;
};
