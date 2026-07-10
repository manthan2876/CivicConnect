import type { Request, Response } from 'express';
import { UlbBoundary } from '../config/db.js';

export interface AuthRequest extends Request {
    user?: any;
}

export const getUlbs = async (req: AuthRequest, res: Response) => {
    try {
        const ulbs = await UlbBoundary.findAll({
            order: [['name', 'ASC']]
        });
        res.json(ulbs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createUlb = async (req: AuthRequest, res: Response) => {
    try {
        const { name, boundaryCoordinates } = req.body;

        if (!name || !boundaryCoordinates || boundaryCoordinates.length < 3) {
            return res.status(400).json({ error: 'Name and at least 3 boundary vertices are required.' });
        }

        const formattedCoordinates = boundaryCoordinates.map((p: [number, number]) => [p[1], p[0]]);
        
        const first = formattedCoordinates[0];
        const last = formattedCoordinates[formattedCoordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            formattedCoordinates.push([first[0], first[1]]);
        }

        const ulb = await UlbBoundary.create({
            name,
            geom: {
                type: 'MultiPolygon',
                coordinates: [[formattedCoordinates]]
            }
        });

        res.status(201).json(ulb);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUlb = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, boundaryCoordinates } = req.body;

        const ulb = await UlbBoundary.findByPk(id as string);
        if (!ulb) {
            return res.status(404).json({ error: 'City (ULB) not found.' });
        }

        if (name) ulb.name = name;

        if (boundaryCoordinates && boundaryCoordinates.length >= 3) {
            const formattedCoordinates = boundaryCoordinates.map((p: [number, number]) => [p[1], p[0]]);
            const first = formattedCoordinates[0];
            const last = formattedCoordinates[formattedCoordinates.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                formattedCoordinates.push([first[0], first[1]]);
            }

            ulb.geom = {
                type: 'MultiPolygon',
                coordinates: [[formattedCoordinates]]
            };
        }

        await ulb.save();
        res.json(ulb);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteUlb = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const ulb = await UlbBoundary.findByPk(id as string);
        if (!ulb) {
            return res.status(404).json({ error: 'City (ULB) not found.' });
        }
        await ulb.destroy();
        res.json({ message: 'City (ULB) deleted successfully.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
