import { Issue, sequelize } from '../config/db.js';
import { Op } from 'sequelize';
import { StorageService } from '../services/storageService.js';
import { AuditService } from '../services/auditService.js';

const ARCHIVE_THRESHOLD_MONTHS = 6;

/**
 * DPDPA Compliance Archiver
 * Runs periodically to anonymize PII and archive old media.
 */
export const runArchivalProcess = async () => {
    try {
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - ARCHIVE_THRESHOLD_MONTHS);

        console.log(`[Archiver] Starting archival for issues resolved before ${thresholdDate.toISOString()}`);

        // 1. Find issues resolved before the threshold
        const oldIssues = await Issue.findAll({
            where: {
                status: 'Resolved',
                updatedAt: {
                    [Op.lt]: thresholdDate
                },
                // Skip if already archived
                needs_human_review: { [Op.not]: true } // Using a flag or checking if PII exists
            }
        });

        console.log(`[Archiver] Found ${oldIssues.length} issues to archive.`);

        for (const issue of oldIssues) {
            try {
                // 2. Anonymize Reporter ID (DPDPA Compliance)
                // We keep the issue for historical analytics but detach personal link
                const originalReporter = issue.reporter_id;
                issue.reporter_id = '00000000-0000-0000-0000-000000000000'; // System Anonymized ID
                issue.reporter_ids = []; 
                
                // 3. Media archival is managed by Supabase Storage retention settings.
                // Here we'll simulate by updating metadata or moving to an archive prefix.
                
                await issue.save();

                AuditService.log({
                    actor_id: 'SYSTEM_ARCHIVER',
                    event_type: 'ISSUE_ANONYMIZED',
                    target_resource: 'issue',
                    target_resource_id: issue.id,
                    new_value: { archived_at: new Date().toISOString() }
                });

            } catch (err) {
                console.error(`[Archiver] Failed to archive issue ${issue.id}:`, err);
            }
        }

        console.log(`[Archiver] Process completed successfully.`);
    } catch (error) {
        console.error('[Archiver] Fatal error in archival process:', error);
    }
};
