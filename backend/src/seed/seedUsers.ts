import { User, Department, Ward, Role, UserRole, Issue } from '../config/db.js';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../config/supabase.js';

dotenv.config();

export const seedUsers = async () => {
    try {
        console.log('Starting seed process for Supabase and PostgreSQL...');

        // 1. Seed Prerequisites (Departments & Wards)
        console.log('Seeding prerequisite departments and wards...');
        
        const depts = [
            { id: '24ba1d92-f1be-4180-94c3-fe5f181afe51', name: 'Public Works Department', contact_email: 'pwd@civicconnect.gov' },
            { id: '1a6f9e45-aca4-4a6c-800f-31fc7924b775', name: 'Environmental Services', contact_email: 'env@civicconnect.gov' },
            { id: '8a39163d-019d-415a-b178-8ca16232c905', name: 'Water & Sewage', contact_email: 'water@civicconnect.gov' },
            { id: '282b4ac0-9e67-40e9-99d8-b569a0f8f6e0', name: 'Electrical Utilities', contact_email: 'elec@civicconnect.gov' },
            { id: '20a21024-5b5c-4ad0-84f2-710db1c7d693', name: 'Infrastructure Solutions', contact_email: 'infra@civicconnect.gov' }
        ];

        for (const dept of depts) {
            await Department.upsert(dept);
        }

        const wards = [
            { id: '993dc994-ea01-4ac1-adad-a42251e2331b', name: 'Ward 01 - Delhi Central', dept_id: '24ba1d92-f1be-4180-94c3-fe5f181afe51', boundary: { type: 'Polygon', coordinates: [[[76.8, 28.4], [77.4, 28.4], [77.4, 28.9], [76.8, 28.9], [76.8, 28.4]]] } },
            { id: 'e90587eb-60d7-48d9-82ce-34c8ff5e600f', name: 'Ward A-1 - Ranchi Main', dept_id: '1a6f9e45-aca4-4a6c-800f-31fc7924b775', boundary: { type: 'Polygon', coordinates: [[[85.2, 23.2], [85.5, 23.2], [85.5, 23.5], [85.2, 23.5], [85.2, 23.2]]] } },
            { id: 'b8ab9a56-52b0-4527-9623-073b250dd484', name: 'Ward K/West - Mumbai', dept_id: '8a39163d-019d-415a-b178-8ca16232c905', boundary: { type: 'Polygon', coordinates: [[[72.7, 18.8], [73.0, 18.8], [73.0, 19.3], [72.7, 19.3], [72.7, 18.8]]] } }
        ];

        for (const ward of wards) {
            await Ward.upsert(ward);
        }

        // 2. Clear existing local user records in PG
        await User.destroy({ where: {}, truncate: true, cascade: true });

        const testUsers = [
            // --- SUPER ADMIN ---
            {
                name: 'Municipal Commissioner',
                email: 'commissioner@civicconnect.gov',
                password: 'password123',
                role: 'super_admin',
                designation: 'Municipal Commissioner',
                phone: '+919000000001'
            },
            // --- ADMINS / OPERATORS ---
            {
                name: 'HQ Control Room',
                email: 'controlroom@civicconnect.gov',
                password: 'password123',
                role: 'admin',
                designation: 'Chief Operator',
                phone: '+919000000002'
            },
            // --- PWD (Public Works) ---
            {
                name: 'Exec Engineer (PWD Delhi)',
                email: 'authority.pwd@civicconnect.gov',
                password: 'password123',
                role: 'authority',
                designation: 'Executive Engineer',
                department_id: '24ba1d92-f1be-4180-94c3-fe5f181afe51',
                phone: '+919000000003'
            },
            {
                name: 'Junior Engineer (PWD Delhi)',
                email: 'staff.pwd@civicconnect.gov',
                password: 'password123',
                role: 'staff',
                designation: 'Junior Engineer',
                department_id: '24ba1d92-f1be-4180-94c3-fe5f181afe51',
                ward_id: '993dc994-ea01-4ac1-adad-a42251e2331b',
                phone: '+919000000004'
            },
            // --- HQ STAFF ---
            {
                name: 'HQ Operations Desk',
                email: 'hq.staff@civicconnect.gov',
                password: 'password123',
                role: 'hq_staff',
                designation: 'HQ Office Coordinator',
                phone: '+919000000005'
            },
            // --- Environmental Services ---
            {
                name: 'Sanitation Inspector (Ranchi)',
                email: 'staff.env.ranchi@civicconnect.gov',
                password: 'password123',
                role: 'staff',
                designation: 'Sanitation Inspector',
                department_id: '1a6f9e45-aca4-4a6c-800f-31fc7924b775',
                ward_id: 'e90587eb-60d7-48d9-82ce-34c8ff5e600f',
                phone: '+919000000006'
            },
            // --- Water & Sewage ---
            {
                name: 'Water Works Head (Mumbai)',
                email: 'authority.water.mumbai@civicconnect.gov',
                password: 'password123',
                role: 'authority',
                designation: 'Asst Commissioner (Water)',
                department_id: '8a39163d-019d-415a-b178-8ca16232c905',
                phone: '+919000000007'
            },
            {
                name: 'Field Technician (Water Mumbai)',
                email: 'staff.water.mumbai@civicconnect.gov',
                password: 'password123',
                role: 'staff',
                designation: 'Field Technician',
                department_id: '8a39163d-019d-415a-b178-8ca16232c905',
                ward_id: 'b8ab9a56-52b0-4527-9623-073b250dd484',
                phone: '+919000000008'
            },
            // --- Electrical Utilities ---
            {
                name: 'Lighting Supervisor (Delhi)',
                email: 'staff.elec.delhi@civicconnect.gov',
                password: 'password123',
                role: 'staff',
                designation: 'Electrical Supervisor',
                department_id: '282b4ac0-9e67-40e9-99d8-b569a0f8f6e0',
                ward_id: '993dc994-ea01-4ac1-adad-a42251e2331b',
                phone: '+919000000009'
            },
            // --- Infrastructure Solutions ---
            {
                name: 'Chief Architect (Infra)',
                email: 'authority.infra@civicconnect.gov',
                password: 'password123',
                role: 'authority',
                designation: 'Chief Architect',
                department_id: '20a21024-5b5c-4ad0-84f2-710db1c7d693',
                phone: '+919000000010'
            },
            // --- CITIZENS ---
            // --- VIEWERS (Unverified Citizens) ---
            {
                name: 'Unverified Citizen Guest',
                email: 'viewer.delhi@test.com',
                password: 'password123',
                role: 'viewer',
                designation: 'Viewer',
                ward_id: '993dc994-ea01-4ac1-adad-a42251e2331b', // Ward 01 - Delhi Central
                phone: null
            },
            {
                name: 'Test Citizen (Delhi)',
                email: 'citizen.delhi@test.com',
                password: 'password123',
                role: 'citizen',
                designation: 'Citizen',
                phone: '+919111111111'
            },
            {
                name: 'Test Citizen (Mumbai)',
                email: 'citizen.mumbai@test.com',
                password: 'password123',
                role: 'citizen',
                designation: 'Citizen',
                phone: '+919222222222'
            },
            {
                name: 'Test Citizen (Ranchi)',
                email: 'citizen.ranchi@test.com',
                password: 'password123',
                role: 'citizen',
                designation: 'Citizen',
                phone: '+919333333333'
            }
        ];

        for (const userData of testUsers) {
            console.log(`Processing user: ${userData.email} (${userData.role})`);
            
            // 1. Create/Update in Supabase Auth
            const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: { 
                    role: userData.role, 
                    name: userData.name,
                    designation: userData.designation 
                }
            });

            let authId = user?.id;

            if (error && (error.message.toLowerCase().includes('already') && error.message.toLowerCase().includes('registered'))) {
                console.log(`User ${userData.email} already exists in Supabase Auth. Fetching ID...`);
                // Using search to be more efficient than listing all
                const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
                authId = existingUser.users.find((u: any) => u.email === userData.email)?.id;
                
                // Update metadata if user already exists
                if (authId) {
                    await supabaseAdmin.auth.admin.updateUserById(authId, {
                        user_metadata: { 
                            role: userData.role, 
                            name: userData.name,
                            designation: userData.designation 
                        }
                    });
                }
            } else if (error) {
                console.error(`Error creating user ${userData.email} in Supabase:`, error.message);
                continue;
            } else {
                console.log(`User ${userData.email} created in Supabase Auth.`);
            }

            // 2. Sync to public.users table in PostgreSQL
            if (authId) {
                await User.upsert({
                    id: authId,
                    email: userData.email,
                    phone: userData.phone,
                    role: userData.role,
                    designation: userData.designation,
                    department_id: (userData as any).department_id || null,
                    ward_id: (userData as any).ward_id || null,
                    green_credits: 100,
                    is_active: true
                });

                // Link role in UserRole
                let roleName = userData.role;
                if (roleName === 'staff') {
                    roleName = 'field_officer';
                } else if (roleName === 'authority') {
                    roleName = 'dept_head';
                }


                const dbRole = await Role.findOne({ where: { name: roleName } });
                if (dbRole) {
                    await UserRole.upsert({
                        user_id: authId,
                        role_id: dbRole.id
                    });
                    console.log(`User ${userData.email} linked to role ${roleName} in DB.`);
                } else {
                    console.warn(`Role ${roleName} not found in DB for user ${userData.email}`);
                }

                console.log(`User ${userData.email} synced to PostgreSQL.`);
            }
        }

        // 3. Seed Mock Issue Reports
        console.log('Seeding mock issue reports for live telemetry...');
        const citizenUser = await User.findOne({ where: { role: 'citizen' } });
        if (citizenUser) {
            const reporterId = citizenUser.id;
            const mockIssues = [
                {
                    reporter_id: reporterId,
                    ward_id: '993dc994-ea01-4ac1-adad-a42251e2331b', // Ward 01 - Delhi Central
                    location: { type: 'Point', coordinates: [77.2, 28.6] },
                    category: 'Solid Waste Management',
                    description: 'Accumulated waste on the streets.',
                    priority_score: 8.5,
                    status: 'Pending',
                    assigned_department_id: '1a6f9e45-aca4-4a6c-800f-31fc7924b775' // Environmental Services
                },
                {
                    reporter_id: reporterId,
                    ward_id: 'e90587eb-60d7-48d9-82ce-34c8ff5e600f', // Ward A-1 - Ranchi Main
                    location: { type: 'Point', coordinates: [85.3, 23.3] },
                    category: 'Water Supply',
                    description: 'Main pipe burst leakage.',
                    priority_score: 9.0,
                    status: 'Resolved',
                    assigned_department_id: '8a39163d-019d-415a-b178-8ca16232c905' // Water & Sewage
                },
                {
                    reporter_id: reporterId,
                    ward_id: 'b8ab9a56-52b0-4527-9623-073b250dd484', // Ward K/West - Mumbai
                    location: { type: 'Point', coordinates: [72.8, 19.0] },
                    category: 'Road Repairs',
                    description: 'Major potholes on road.',
                    priority_score: 7.2,
                    status: 'Pending',
                    assigned_department_id: '24ba1d92-f1be-4180-94c3-fe5f181afe51' // Public Works Department
                },
                {
                    reporter_id: reporterId,
                    ward_id: '993dc994-ea01-4ac1-adad-a42251e2331b',
                    location: { type: 'Point', coordinates: [77.21, 28.62] },
                    category: 'Streetlights',
                    description: 'Flickering street pole lights.',
                    priority_score: 6.0,
                    status: 'Pending',
                    assigned_department_id: '282b4ac0-9e67-40e9-99d8-b569a0f8f6e0' // Electrical Utilities
                },
                {
                    reporter_id: reporterId,
                    ward_id: 'b8ab9a56-52b0-4527-9623-073b250dd484',
                    location: { type: 'Point', coordinates: [72.82, 19.02] },
                    category: 'Infrastructure',
                    description: 'Damaged public walk railing.',
                    priority_score: 5.5,
                    status: 'Resolved',
                    assigned_department_id: '20a21024-5b5c-4ad0-84f2-710db1c7d693' // Infrastructure Solutions
                }
            ];

            for (const issueData of mockIssues) {
                await Issue.create(issueData);
            }
            console.log('✔ Seeded mock issues successfully.');
        } else {
            console.warn('⚠️ No citizen user found in DB. Skipping mock issues seeding.');
        }

        console.log(`Successfully seeded ${testUsers.length} professional municipal personas.`);
    } catch (error) {
        console.error('Error seeding users:', error);
        throw error;
    }
};


