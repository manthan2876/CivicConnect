import cron from 'node-cron';
import { Issue, sequelize } from '../config/db.js';
import { Op } from 'sequelize';

export const startSpatialDeduplicator = () => {
    // Run every night at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Starting nightly spatial deduplication job using ST_ClusterDBSCAN...');
        try {
            // Step 1: Cluster pending issues using DBSCAN
            // eps 0.0005 is approximately 50 meters
            const sql = `
                WITH clustered_issues AS (
                    SELECT 
                        id, 
                        category, 
                        reporter_ids,
                        minio_image_urls,
                        minio_audio_urls,
                        priority_score,
                        ST_ClusterDBSCAN(location::geometry, eps := 0.0005, minpoints := 2) OVER(PARTITION BY category) as cluster_id
                    FROM issues
                    WHERE status = 'Pending'
                )
                SELECT 
                    cluster_id, 
                    category,
                    array_agg(id) as issue_ids
                FROM clustered_issues
                WHERE cluster_id IS NOT NULL
                GROUP BY cluster_id, category;
            `;

            const [results] = await sequelize.query(sql);

            if (!results || results.length === 0) {
                console.log('[CRON] No duplicate clusters found tonight.');
                return;
            }

            for (const group of (results as any[])) {
                const issueIds = group.issue_ids;
                if (!issueIds || issueIds.length < 2) continue;

                // Sort issues chronologically to find the oldest (primary)
                const issues = await Issue.findAll({
                    where: { id: { [Op.in]: issueIds } },
                    order: [['createdAt', 'ASC']]
                });

                if (issues.length < 2) continue;

                const primaryIssue = issues[0]!;
                const duplicates = issues.slice(1);

                console.log(`[CRON] Merging cluster ${group.cluster_id} (${group.category}). Primary: ${primaryIssue.id}, Merging: ${duplicates.length} issues.`);

                const mergedReporters = new Set<string>(primaryIssue.reporter_ids || []);
                const mergedImages = new Set<string>(primaryIssue.minio_image_urls || []);
                const mergedAudio = new Set<string>(primaryIssue.minio_audio_urls || []);
                
                let addedPriority = 0;

                for (const dup of duplicates) {
                    if (dup.reporter_ids) dup.reporter_ids.forEach(r => mergedReporters.add(r));
                    if (dup.minio_image_urls) dup.minio_image_urls.forEach(i => mergedImages.add(i));
                    if (dup.minio_audio_urls) dup.minio_audio_urls.forEach(a => mergedAudio.add(a));
                    addedPriority += 10; // Boost priority for each duplicate merged
                }

                // Update primary
                primaryIssue.reporter_ids = Array.from(mergedReporters);
                primaryIssue.minio_image_urls = Array.from(mergedImages);
                primaryIssue.minio_audio_urls = Array.from(mergedAudio);
                primaryIssue.priority_score = (primaryIssue.priority_score || 0) + addedPriority;
                
                await primaryIssue.save();

                // Delete duplicates
                const duplicateIds = duplicates.map(d => d.id);
                await Issue.destroy({ where: { id: { [Op.in]: duplicateIds } } });
                
                console.log(`[CRON] Cluster ${group.cluster_id} merged. Priority boosted to ${primaryIssue.priority_score}. Deleted ${duplicateIds.length} duplicate tickets.`);
            }

            console.log('[CRON] Nightly Deduplication complete.');
        } catch (error) {
            console.error('[CRON] Deduplication error:', error);
        }
    });

    console.log('✅ Nightly Deduplicator Cron Job Registered (Runs at 02:00 AM).');
};
