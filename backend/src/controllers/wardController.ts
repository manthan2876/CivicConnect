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

        const wardGeom = {
            type: 'Polygon',
            coordinates: [formattedCoordinates]
        };

        // Perform ST_Within spatial containment check if zone_id is provided
        if (zone_id) {
            const zone = await Zone.findByPk(zone_id);
            if (!zone) {
                return res.status(404).json({ error: 'Selected Zone not found.' });
            }
            if (zone.boundary) {
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

        // Perform ST_Within spatial containment check if ulb_id is provided
        if (ulb_id) {
            const ulb = await UlbBoundary.findByPk(ulb_id);
            if (!ulb) {
                return res.status(404).json({ error: 'Selected City (ULB) not found.' });
            }
            if (ulb.geom) {
                const queryStr = `
                    SELECT ST_Within(
                        ST_GeomFromGeoJSON(:wardGeom),
                        ST_GeomFromGeoJSON(:ulbGeom)
                    ) AS is_within
                `;

                const [spatialCheck]: any = await sequelize.query(queryStr, {
                    replacements: {
                        wardGeom: JSON.stringify(wardGeom),
                        ulbGeom: JSON.stringify(ulb.geom)
                    },
                    type: QueryTypes.SELECT
                });

                if (!spatialCheck || !spatialCheck.is_within) {
                    return res.status(400).json({ error: "Ward boundary must be completely within the selected city's boundary." });
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

export const updateWard = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { name, dept_id, boundaryCoordinates } = req.body;
        let ulb_id = req.body.ulb_id;
        let zone_id = req.body.zone_id;

        if (user && user.role !== 'super_admin') {
            ulb_id = user.ulb_id;
        }

        const ward = await Ward.findByPk(id as string);
        if (!ward) {
            return res.status(404).json({ error: 'Ward not found.' });
        }

        if (name) ward.name = name;
        if (dept_id) ward.dept_id = dept_id;
        if (ulb_id !== undefined) ward.ulb_id = ulb_id || null;
        if (zone_id !== undefined) ward.zone_id = zone_id || null;

        if (boundaryCoordinates && boundaryCoordinates.length >= 3) {
            const formattedCoordinates = boundaryCoordinates.map((p: [number, number]) => [p[1], p[0]]);
            const first = formattedCoordinates[0];
            const last = formattedCoordinates[formattedCoordinates.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                formattedCoordinates.push([first[0], first[1]]);
            }

            const wardGeom = {
                type: 'Polygon',
                coordinates: [formattedCoordinates]
            };

            const targetZoneId = zone_id !== undefined ? zone_id : ward.zone_id;
            if (targetZoneId) {
                const zone = await Zone.findByPk(targetZoneId);
                if (zone && zone.boundary) {
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

            const targetUlbId = ulb_id !== undefined ? ulb_id : ward.ulb_id;
            if (targetUlbId) {
                const ulb = await UlbBoundary.findByPk(targetUlbId);
                if (ulb && ulb.geom) {
                    const queryStr = `
                        SELECT ST_Within(
                            ST_GeomFromGeoJSON(:wardGeom),
                            ST_GeomFromGeoJSON(:ulbGeom)
                        ) AS is_within
                    `;

                    const [spatialCheck]: any = await sequelize.query(queryStr, {
                        replacements: {
                            wardGeom: JSON.stringify(wardGeom),
                            ulbGeom: JSON.stringify(ulb.geom)
                        },
                        type: QueryTypes.SELECT
                    });

                    if (!spatialCheck || !spatialCheck.is_within) {
                        return res.status(400).json({ error: "Ward boundary must be completely within the selected city's boundary." });
                    }
                }
            }

            ward.boundary = wardGeom;
        }

        await ward.save();
        res.json(ward);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteWard = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const ward = await Ward.findByPk(id as string);
        if (!ward) {
            return res.status(404).json({ error: 'Ward not found.' });
        }
        await ward.destroy();
        res.json({ message: 'Ward deleted successfully.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
