import { sequelize, Issue } from '../config/db.js';

import { QueryTypes } from 'sequelize';

export class SpatialService {
    /**
     * Category-specific spatial impact radii (in meters).
     * High-precision issues (potholes) have small radii,
     * while broad issues (flooding) have larger radii.
     */
    private static readonly SPATIAL_RADIUS_MAP: Record<string, number> = {
        'pothole_road_crack': 10,
        'flooding_waterlogging': 50,
        'garbage_overflow_west_container': 20,
        'damaged_sidewalk': 15,
        'damaged_sign': 15,
        'streetlight_damage': 20,
        'illegal_parking': 20,
        'open_manhole': 10,
        'construction_waste': 30,
        'powerline_damage': 40,
        'dead_animal': 15,
        'illegal_construction': 50
    };

    /**
     * Checks if a similar issue exists within the category's dynamic radius.
     * @returns The matching Issue or null.
     */
    static async findDuplicateIssue(lat: number, lon: number, category: string): Promise<Issue | null> {
        try {
            const radius = this.SPATIAL_RADIUS_MAP[category] || 25;
            
            // PostGIS ST_DWithin query
            // 4326 is WGS 84 (GPS), but ST_DWithin with meters requires casting to geography
            const duplicates: any = await sequelize.query(`
                SELECT id FROM issues
                WHERE category = :category
                AND status != 'Resolved'
                AND ST_DWithin(
                    location::geography, 
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                    :radius
                )
                ORDER BY "createdAt" DESC
                LIMIT 1
            `, {
                replacements: { lat, lon, category, radius },
                type: QueryTypes.SELECT
            });

            if (duplicates.length > 0) {
                return await Issue.findByPk(duplicates[0].id);
            }

            return null;
        } catch (error) {
            console.error('Spatial Deduplication Error:', error);
            return null;
        }
    }

    /**
     * Appends a new reporter and evidence to an existing issue.
     */
    static async handleDuplicate(issue: Issue, reporterId: string, imageUrl?: string, audioUrl?: string) {
        // 1. Update Reporter List (Atomic set to avoid duplication)
        const currentReporters = issue.get('reporter_ids') || [];
        if (!currentReporters.includes(reporterId)) {
            currentReporters.push(reporterId);
        }

        // 2. Append Evidence
        const currentImages = issue.get('minio_image_urls') || [];
        if (imageUrl) currentImages.push(imageUrl);

        const currentAudios = issue.get('minio_audio_urls') || [];
        if (audioUrl) currentAudios.push(audioUrl);

        // 3. Boost Priority (Deduplication bonus)
        // Every additional reporter adds weight to the urgency
        const baseScore = issue.get('priority_score') as number;
        const newScore = Math.min(baseScore + 5, 100); 

        return await issue.update({
            reporter_ids: currentReporters,
            minio_image_urls: currentImages,
            minio_audio_urls: currentAudios,
            priority_score: newScore
        });
    }
}
