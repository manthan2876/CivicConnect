import { Department } from '../models/Department.js';
import { User } from '../models/User.js';

export class TriageService {
    /**
     * Maps an issue category to the most appropriate departmental name.
     */
    private static getDepartmentNameForCategory(category: string): string {
        const cat = category.toLowerCase();
        
        if (cat.includes('pothole') || cat.includes('road')) {
            return 'Infrastructure Solutions';
        }
        if (cat.includes('waste') || cat.includes('garbage')) {
            return 'Environmental Services';
        }
        if (cat.includes('light') || cat.includes('electrical')) {
            return 'Electrical Utilities';
        }
        if (cat.includes('water') || cat.includes('drainage') || cat.includes('sewage')) {
            return 'Water & Sewage Management';
        }
        if (cat.includes('encroachment')) {
            return 'Public Works Department';
        }
        if (cat.includes('criminal') || cat.includes('vandalism')) {
            return 'Public Safety & Security';
        }
        
        return 'Public Works Department';
    }

    /**
     * Resolves the department ID for a given category.
     * If the department does not exist, it falls back to the default.
     */
    static async getDepartmentIdForCategory(category: string): Promise<string | null> {
        try {
            const targetName = this.getDepartmentNameForCategory(category);
            const dept = await Department.findOne({ where: { name: targetName } });
            
            if (dept) return dept.id;
            
            // Final fallback to any case-insensitive match for 'Public Works'
            const fallback = await Department.findOne({ 
                where: { name: 'Public Works Department' } 
            });
            
            return fallback ? fallback.id : null;
        } catch (error) {
            console.error('[TriageService] Resolution Error:', error);
            return null;
        }
    }
    static async findBestStaff(deptId: string | null, wardId: string | null): Promise<string | null> {
        if (!deptId) return null;
        
        try {
            // Import Issue and sequelize here to avoid circular dependency if any
            const { Issue } = await import('../models/Issue.js');
            const { Op } = await import('sequelize');

            // 1. Find all eligible staff in the department (optionally filtered by ward)
            const staffFilter: any = {
                role: 'staff',
                department_id: deptId,
                is_active: true
            };
            if (wardId) staffFilter.ward_id = wardId;

            const eligibleStaff = await User.findAll({ where: staffFilter });
            
            if (eligibleStaff.length === 0) {
                // If no staff in ward, broaden to entire department
                if (wardId) {
                    delete staffFilter.ward_id;
                    const broadStaff = await User.findAll({ where: staffFilter });
                    if (broadStaff.length === 0) return null;
                    eligibleStaff.push(...broadStaff);
                } else {
                    return null;
                }
            }

            // 2. Count active tasks for each staff member
            const staffWithWorkloads = await Promise.all(eligibleStaff.map(async (staff) => {
                const activeTaskCount = await Issue.count({
                    where: {
                        assigned_staff_id: staff.id,
                        status: { [Op.notIn]: ['Resolved', 'Closed'] }
                    }
                });
                return { id: staff.id, workload: activeTaskCount };
            }));

            // 3. Sort by workload (ascending) and return the best one
            staffWithWorkloads.sort((a, b) => a.workload - b.workload);
            
            const bestStaff = staffWithWorkloads[0];
            if (!bestStaff) return null;
            
            console.log(`[TriageService] Load Balancing: Selected Staff ${bestStaff.id} with workload ${bestStaff.workload}`);
            
            return bestStaff.id;
        } catch (error) {
            console.error('[TriageService] Staff Selection Error:', error);
            return null;
        }
    }
}
