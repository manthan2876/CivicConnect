import type { Request, Response } from 'express';
import { Ward, Department, UlbBoundary, Zone, sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';

export interface AuthRequest extends Request {
    user?: any;
}

export const getWards = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const where: any = {};

        if (user && user.role !== 'super_admin' && user.ulb_id) {
            where.ulb_id = user.ulb_id;
        }

        const wards = await Ward.findAll({
            where,
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: UlbBoundary, as: 'ulb', attributes: ['id', 'name'] },
                { model: Zone, as: 'zone', attributes: ['id', 'name', 'code'] }
            ],
            order: [['name', 'ASC']]
        });
        res.json(wards);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createWard = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { name, dept_id, boundaryCoordinates } = req.body;
        let ulb_id = req.body.ulb_id;
        let zone_id = req.body.zone_id || null;

        if (user && user.role !== 'super_admin') {
            ulb_id = user.ulb_id;
        }

        if (!name || !dept_id || !boundaryCoordinates || boundaryCoordinates.length < 3) {
            return res.status(400).json({ error: 'Name, dept_id, and at least 3 boundary vertices are required.' });
        }

        const formattedCoordinates = boundaryCoordinates.map((p: [number, number]) => [p[1], p[0]]);
        
        const first = formattedCoordinates[0];
        const last = formattedCoordinates[formattedCoordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            formattedCoordinates.push([first[0], first[1]]);
        }

        // Perform ST_Within spatial containment check if zone_id is provided
        if (zone_id) {
            const zone = await Zone.findByPk(zone_id);
            if (!zone) {
                return res.status(404).json({ error: 'Selected Zone not found.' });
            }
            if (zone.boundary) {
                const wardGeom = {
                    type: 'Polygon',
                    coordinates: [formattedCoordinates]
                };

                const queryStr = `
                    SELECT ST_Within(
                        ST_GeomFromGeoJSON(:wardGeom),
                        ST_GeomFromGeoJSON(:zoneGeom)
                    ) AS is_within
                `;

                const [spatialCheck]: any = await sequelize.query(queryStr, {
                    replacements: {
                        wardGeom: JSON.stringify(wardGeom),
                        zoneGeom: JSON.stringify(zone.boundary)
                    },
                    type: QueryTypes.SELECT
                });

                if (!spatialCheck || !spatialCheck.is_within) {
                    return res.status(400).json({ error: "Ward boundary must be completely within the selected zone's boundary." });
                }
            }
        }

        const ward = await Ward.create({
            name,
            dept_id,
            ulb_id: ulb_id || null,
            zone_id,
            boundary: {
                type: 'Polygon',
                coordinates: [formattedCoordinates]
            }
        });

        res.status(201).json(ward);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
