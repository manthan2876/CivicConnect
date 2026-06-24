import { sequelize, User } from '../config/db.js';
import { QueryTypes } from 'sequelize';

export class PriorityService {
    // Weights from .env or defaults
    private static alpha = parseFloat(process.env.PRIORITY_WEIGHT_VISUAL || '0.4');
    private static beta = parseFloat(process.env.PRIORITY_WEIGHT_TEXTUAL || '0.3');
    private static gamma = parseFloat(process.env.PRIORITY_WEIGHT_DENSITY || '0.2');
    private static delta = parseFloat(process.env.PRIORITY_WEIGHT_CREDIBILITY || '0.1');

    /**
     * Calculates the Algorithmic Priority Score (P) as per SRS FR 4.
     * P = (alpha * Vs) + (beta * Tu) + (gamma * Sd) + (delta * Uc)
     */
    static async calculatePriority(
        userId: string,
        _wardId: string,
        longitude: number,
        latitude: number,
        textualUrgency: number,
        visualSeverity: number = 50, // Default if no image analysis available
        aiStatus: string = 'Pending'
    ): Promise<number> {
        try {
            // ... (previous logic for Sd and Uc)
            const nearbyCountResult: any = await sequelize.query(`
                SELECT COUNT(*) as count FROM issues
                WHERE ST_DWithin(
                    location, 
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), 
                    0.001 
                )
                AND status != 'Resolved'
            `, {
                replacements: { lon: longitude, lat: latitude },
                type: QueryTypes.SELECT
            });
            const spatialDensity = Math.min(parseInt(nearbyCountResult[0]?.count || '0') * 10, 100);

            const user = await User.findByPk(userId);
            const userCredibility = Math.min((user?.green_credits || 0) / 10, 100);

            // Calculate Base Score
            let P = (this.alpha * visualSeverity) +
                    (this.beta * textualUrgency) +
                    (this.gamma * spatialDensity) +
                    (this.delta * userCredibility);

            // Apply AI Verification Multiplier
            if (aiStatus === 'Verified') {
                P *= 1.25; // 25% boost for AI verified reports
            } else if (aiStatus === 'Mismatch') {
                P *= 0.75; // 25% penalty for mismatched reports
            } else if (aiStatus === 'Uncertain') {
                P *= 0.90; // 10% penalty for high-conflict AI results
            }


            return Math.round(Math.min(P, 100)); // Capped at 100

        } catch (error) {
            console.error('Priority Calculation Error:', error);
            return 50; // Fallback to medium priority
        }
    }
}
