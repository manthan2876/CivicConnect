import type { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize, User, Issue, Repair, Ward } from '../../config/db.js';
import { StorageService } from '../../services/storageService.js';
import type { AuthRequest } from './report.utils.js';
import { SENSITIVE_CATEGORIES, obfuscateLocation } from './report.utils.js';
import { buildReportsWhereClause, buildStatsWhereClause, buildGeoJSONWhereClause } from './report.query.utils.js';

export const getReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const whereClause = await buildReportsWhereClause(req.user, req.query);
        const issues = await Issue.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        const userRole = (req.user?.role || 'citizen').toLowerCase();
        const isPrivileged = ['admin', 'super_admin', 'dept_head', 'field_officer', 'hq_staff', 'authority', 'staff'].includes(userRole);

        const transformedIssues = await Promise.all(issues.map(async (issue) => {
            const report = issue.get();
            if (SENSITIVE_CATEGORIES.includes(report.category) && !isPrivileged) {
                const [lon, lat] = obfuscateLocation(report.location.coordinates[0], report.location.coordinates[1]);
                report.location = { ...report.location, coordinates: [lon, lat] };
            }

            if (report.minio_pre_key) {
                report.minio_pre_key = await StorageService.getPresignedUrl(report.minio_pre_key);
            }

            let resolutionImageUrl: string | null = null;
            if (['Pending Confirmation', 'Pending Citizen Confirmation', 'Resolved'].includes(report.status)) {
                const repair = await Repair.findOne({ where: { issue_id: report.id }, order: [['createdAt', 'DESC']] });
                if (repair && repair.minio_post_key) {
                    resolutionImageUrl = await StorageService.getPresignedUrl(repair.minio_post_key);
                }
            }
            report.resolution_image_url = resolutionImageUrl;
            report.metadata = { ...report.metadata, resolution_image_url: resolutionImageUrl };

            return report;
        }));

        return res.json(transformedIssues);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getReportStats = async (req: AuthRequest, res: Response) => {
    try {
        const where = await buildStatsWhereClause(req.user);
        let green_credits = 0;
        if (!['admin', 'mayor', 'field_officer', 'staff', 'dept_head', 'authority'].includes((req.user?.role || '').toLowerCase())) {
            const dbUser = await User.findByPk(req.user?.id);
            if (dbUser) green_credits = dbUser.green_credits;
        }

        const total = await Issue.count({ where });
        const pending = await Issue.count({ where: { ...where, status: 'Pending' } });
        const resolved = await Issue.count({ where: { ...where, status: 'Resolved' } });
        const inProgress = await Issue.count({ where: { ...where, status: 'In Progress' } });

        const categoryCounts = await Issue.findAll({
            where,
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
            group: ['category']
        });

        const categoryData = categoryCounts.map((c: any) => ({
            name: c.category,
            value: parseInt(c.get('count'))
        }));

        res.json({
            summary: [
                { title: 'Total Issues', value: total, trend: 12, color: 'blue' },
                { title: 'Resolved', value: resolved, trend: 8, color: 'emerald' },
                { title: 'Pending', value: pending, trend: -5, color: 'rose' },
                { title: 'In Progress', value: inProgress, trend: 2, color: 'amber' },
            ],
            categoryData,
            total,
            resolved,
            green_credits,
        });
    } catch (error: any) {
        console.error('Error in getReportStats:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findByPk(id as string);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });
        
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        const permissions: string[] = req.user?.permissions || [];
        const isReporter = issue.reporter_id === req.user?.id;
        
        if (!permissions.includes('report:view_all')) {
            if (permissions.includes('report:view_area') && issue.ward_id !== req.user?.ward_id) {
                return res.status(403).json({ error: 'Forbidden: Issue is outside your assigned ward' });
            } else if (permissions.includes('report:view_my') && !isReporter) {
                return res.status(403).json({ error: 'Forbidden: You can only access your own reported issues' });
            } else if (!permissions.includes('report:view_area') && !permissions.includes('report:view_my')) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
        }

        const isSensitive = SENSITIVE_CATEGORIES.includes(issue.category);
        const isPrivileged = ['admin', 'super_admin', 'dept_head', 'field_officer', 'hq_staff', 'authority', 'staff'].includes(userRole);

        if (isSensitive && !isPrivileged) {
            const [lon, lat] = obfuscateLocation(issue.location.coordinates[0], issue.location.coordinates[1]);
            issue.location.coordinates = [lon, lat];
        }

        const report = issue.get();
        if (report.minio_pre_key) report.minio_pre_key = await StorageService.getPresignedUrl(report.minio_pre_key);
        if (report.minio_audio_key) report.minio_audio_key = await StorageService.getPresignedUrl(report.minio_audio_key);
        
        if (report.minio_image_urls && report.minio_image_urls.length > 0) {
            report.minio_image_urls = await Promise.all(report.minio_image_urls.map((url: string) => StorageService.getPresignedUrl(url)));
        }
        if (report.minio_audio_urls && report.minio_audio_urls.length > 0) {
            report.minio_audio_urls = await Promise.all(report.minio_audio_urls.map((url: string) => StorageService.getPresignedUrl(url)));
        }

        let resolutionImageUrl: string | null = null;
        if (['Pending Confirmation', 'Pending Citizen Confirmation', 'Resolved'].includes(report.status)) {
            const repair = await Repair.findOne({ where: { issue_id: report.id }, order: [['createdAt', 'DESC']] });
            if (repair && repair.minio_post_key) {
                resolutionImageUrl = await StorageService.getPresignedUrl(repair.minio_post_key);
            }
        }
        report.resolution_image_url = resolutionImageUrl;
        report.metadata = { ...report.metadata, resolution_image_url: resolutionImageUrl };

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getGeoJSONReports = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { status } = req.query;
        const userRole = (req.user?.role || 'citizen').toLowerCase();
        const whereClause = await buildGeoJSONWhereClause(req.user, status);

        const issues = await Issue.findAll({
            where: whereClause,
            attributes: [
                'id', 'category', 'status', 'priority_score', 'description', 'minio_pre_key',
                'reporter_id', 'assigned_staff_id', 'createdAt', 'updatedAt',
                [sequelize.fn('ST_AsGeoJSON', sequelize.col('location')), 'location_geojson']
            ],
            raw: true,
        });

        const issuesWithLocation = issues.filter((issue: any) => !!issue.location_geojson);
        const features = issuesWithLocation.map((issue: any) => {
            let geometry: any;
            try {
                geometry = JSON.parse(issue.location_geojson);
            } catch {
                return null;
            }
            const coords = geometry?.coordinates;
            if (!coords) return null;

            const isSensitive = SENSITIVE_CATEGORIES.includes(issue.category);
            const isPrivileged = ['admin', 'super_admin', 'dept_head', 'field_officer', 'hq_staff', 'authority', 'staff'].includes(userRole);

            if (isSensitive && !isPrivileged) {
                geometry.coordinates = obfuscateLocation(coords[0], coords[1]);
            }

            const properties = { ...issue };
            delete properties.location_geojson;

            return { type: 'Feature', geometry, properties };
        }).filter(Boolean);

        res.json({ type: 'FeatureCollection', features });
    } catch (error: any) {
        console.error('[GeoJSON] Error building GeoJSON response:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export const getAuthorityKPIs = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { department_id } = req.query;
        const where: any = {};
        if (department_id) {
            where.assigned_department_id = department_id;
        }

        const total = await Issue.count({ where });
        const resolved = await Issue.count({ where: { ...where, status: 'Resolved' } });
        const pending = await Issue.count({ where: { ...where, status: 'Pending' } });

        const userWhere: any = {
            role: { [Op.ne]: 'citizen' }
        };
        if (department_id) {
            userWhere.department_id = department_id;
        }
        const activePersonnel = await User.count({ where: userWhere });

        const totalWards = await Ward.count();
        const wardsWithIssues = await Issue.count({
            distinct: true,
            col: 'ward_id',
            where
        });
        const municipalCoverage = totalWards > 0 
            ? Math.round((wardsWithIssues / totalWards) * 100) 
            : 100;

        // Calculate SLA compliance (e.g. issues resolved within 48 hours)
        const resolvedIssues = await Issue.findAll({
            where: { ...where, status: 'Resolved' }
        });
        let slaCompliance = 100;
        if (resolvedIssues.length > 0) {
            const withinSLA = resolvedIssues.filter(issue => {
                const created = new Date(issue.createdAt);
                const updated = new Date(issue.updatedAt);
                const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
                return diffHours <= 48;
            }).length;
            slaCompliance = Math.round((withinSLA / resolvedIssues.length) * 100);
        }

        res.json({
            totalIssues: total,
            resolvedCount: resolved,
            pendingCount: pending,
            slaCompliance: slaCompliance || 85,
            satisfactionScore: 4.5,
            activePersonnel,
            municipalCoverage
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getNearbyReports = async (req: AuthRequest, res: Response) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;
        if (!latitude || !longitude) return res.status(400).json({ error: 'Coordinates missing' });

        const lat = parseFloat(latitude as string);
        const lon = parseFloat(longitude as string);
        const rad = parseFloat(radius as string);

        const issues = await Issue.findAll({
            where: sequelize.where(
                sequelize.fn('ST_DistanceSphere', sequelize.col('location'), sequelize.fn('ST_MakePoint', lon, lat)),
                { [Op.lte]: rad }
            ),
            order: [[sequelize.fn('ST_DistanceSphere', sequelize.col('location'), sequelize.fn('ST_MakePoint', lon, lat)), 'ASC']]
        });

        res.json(issues);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
