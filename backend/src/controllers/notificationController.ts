import type { Response } from 'express';
import { Notification as NotificationDb } from '../config/db.js';

export const getNotifications = async (req: any, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const notifications = await NotificationDb.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createNotification = async (req: any, res: Response): Promise<any> => {
    try {
        const { user_id, title, body, data } = req.body;
        const notification = await NotificationDb.create({ user_id, title, body, data });
        res.status(201).json(notification);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const markAsRead = async (req: any, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const notification = await NotificationDb.findByPk(id as string);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        await notification.update({ is_read: true });
        res.json(notification);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const markAllNotificationsAsRead = async (req: any, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await NotificationDb.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

