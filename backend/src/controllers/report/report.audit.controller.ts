import type { Response } from 'express';
import { AuditLog } from '../../config/db.js';
import { Op } from 'sequelize';
import type { AuthRequest } from './report.utils.js';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const logs = await AuditLog.findAll({
            where: {
                [Op.or]: [
                    { target_resource_id: id },
                    { payload: { issue_id: id } }
                ]
            },
            order: [['createdAt', 'DESC']],
        });

        res.json(logs);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
