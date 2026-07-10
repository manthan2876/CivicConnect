import type { Request, Response } from 'express';
import { Zone, UlbBoundary, sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';

export interface AuthRequest extends Request {
    user?: any;
}

export const getZones = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const where: any = {};

        if (user && user.role !== 'super_admin' && user.ulb_id) {
            where.ulb_id = user.ulb_id;
        }

        const zones = await Zone.findAll({
            where,
            include: [
                { model: UlbBoundary, as: 'ulb', attributes: ['id', 'name'] }
            ],
            order: [['name', 'ASC']]
        });
        res.json(zones);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createZone = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { name, code, boundaryCoordinates } = req.body;
        let ulb_id = req.body.ulb_id;

        if (user && user.role !== 'super_admin') {
            ulb_id = user.ulb_id;
        }

        if (!name || !code) {
            return res.status(400).json({ error: 'Name and code are required.' });
        }

        if (!boundaryCoordinates || boundaryCoordinates.length < 3) {
            return res.status(400).json({ error: 'At least 3 boundary vertices are required to define the zone.' });
        }

        const formattedCoordinates = boundaryCoordinates.map((p: [number, number]) => [p[1], p[0]]);
        const first = formattedCoordinates[0];
        const last = formattedCoordinates[formattedCoordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            formattedCoordinates.push([first[0], first[1]]);
        }
        
        const boundaryObj = {
            type: 'Polygon',
            coordinates: [formattedCoordinates]
        };

        // Perform ST_Within spatial containment check if ulb_id is provided
        if (ulb_id) {
            const ulb = await UlbBoundary.findByPk(ulb_id);
            if (!ulb) {
                return res.status(404).json({ error: 'Selected City (ULB) not found.' });
            }
            if (ulb.geom) {
                const queryStr = `
                    SELECT ST_Within(
                        ST_GeomFromGeoJSON(:zoneGeom),
                        ST_GeomFromGeoJSON(:ulbGeom)
                    ) AS is_within
                `;

                const [spatialCheck]: any = await sequelize.query(queryStr, {
                    replacements: {
                        zoneGeom: JSON.stringify(boundaryObj),
                        ulbGeom: JSON.stringify(ulb.geom)
                    },
                    type: QueryTypes.SELECT
                });

                if (!spatialCheck || !spatialCheck.is_within) {
                    return res.status(400).json({ error: "Zone boundary must be completely within the selected city's boundary." });
                }
            }
        }

        const zone = await Zone.create({
            name,
            code,
            ulb_id: ulb_id || null,
            boundary: boundaryObj
        });

        res.status(201).json(zone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
