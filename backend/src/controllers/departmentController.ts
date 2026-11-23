import type { Request, Response } from 'express';
import { Department, User, sequelize } from '../config/db.js';

export const getDepartments = async (_req: Request, res: Response) => {
    try {
        const depts = await Department.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM users
                            WHERE users.department_id = "Department".id
                            AND users.role IN ('staff', 'field_officer')
                        )`),
                        'staff_count'
                    ]
                ]
            }
        });
        res.json(depts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getDepartmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dept = await Department.findByPk(id as string);
        if (!dept) return res.status(404).json({ error: 'Department not found' });
        res.json(dept);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { name, contact_email } = req.body;
        const dept = await Department.create({
            name,
            contact_email
        });
        res.status(201).json(dept);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, contact_email } = req.body;
        const dept = await Department.findByPk(id as string);
        if (!dept) return res.status(404).json({ error: 'Department not found' });

        if (name) dept.name = name;
        if (contact_email) dept.contact_email = contact_email;

        await dept.save();
        res.json(dept);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Department.destroy({ where: { id } });
        if (deleted === 0) return res.status(404).json({ error: 'Department not found' });
        res.json({ success: true, message: 'Department deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

