import { User, Department, Ward, Role, UserRole, Issue } from '../config/db.js';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../config/supabase.js';

dotenv.config();

export const seedUsers = async () => {
    try {
        console.log('Starting seed process for Surat Municipal Corporation users...');

        // 1. Fetch existing SMC departments and Surat wards
        const allDepts = await Department.findAll();
        const allWards = await Ward.findAll();

        if (allDepts.length === 0 || allWards.length === 0) {
            throw new Error('SMC Departments and Wards must be seeded first by seedUlbBoundaries.');
        }

        const deptMap = allDepts.reduce((acc: any, d: any) => {
            acc[d.name] = d.id;
            return acc;
        }, {});

        // 2. Clear existing local user records in PG (cascade cleans up UserRoles)
        await User.destroy({ where: {}, truncate: true, cascade: true });

        const smcDeptsInfo = [
            { name: 'Road Development', slug: 'road.dev' },
            { name: 'Drainage', slug: 'drainage' },
            { name: 'Hydraulic', slug: 'hydraulic' },
            { name: 'Street Light', slug: 'streetlight' },
            { name: 'Solid Waste Management', slug: 'swm' },
            { name: 'Traffic Cell', slug: 'traffic' },
            { name: 'Bridge Cell', slug: 'bridge' },
            { name: 'BRTS Cell', slug: 'brts' },
            { name: 'Vector Borne Diseases Control', slug: 'vector.control' },
            { name: 'Fire & Emergency Services', slug: 'fire' },
            { name: 'Environment Cell', slug: 'env' },
            { name: 'Air Quality Management Cell', slug: 'air.quality' }
        ];

        const testUsers = [
            // --- SUPER ADMIN ---
            {
                name: 'SMC Commissioner',
                email: 'commissioner@suratmunicipal.org',
                password: 'password123',
                role: 'super_admin',
                designation: 'Municipal Commissioner',
                phone: '+919000000001'
            },
            // --- ADMINS / OPERATORS ---
            {
                name: 'SMC HQ Control Room',
                email: 'controlroom@suratmunicipal.org',
                password: 'password123',
                role: 'admin',
                designation: 'Chief Operator',
                phone: '+919000000002'
            },
            // --- HQ STAFF ---
            {
                name: 'SMC HQ Operations Desk',
                email: 'hq.staff@suratmunicipal.org',
                password: 'password123',
                role: 'hq_staff',
                designation: 'HQ Office Coordinator',
                phone: '+919000000005'
            },
            // --- CITIZENS ---
            {
                name: 'SMC Test Citizen 1',
                email: 'citizen1.surat@test.com',
                password: 'password123',
                role: 'citizen',
                designation: 'Citizen',
                phone: '+919111111111'
            },
            {
                name: 'SMC Test Citizen 2',
                email: 'citizen2.surat@test.com',
                password: 'password123',
                role: 'citizen',
                designation: 'Citizen',
                phone: '+919222222222'
            },
            // --- VIEWERS (Unverified Citizens) ---
            {
                name: 'Unverified Citizen Guest',
                email: 'viewer.surat@test.com',
                password: 'password123',
                role: 'viewer',
                designation: 'Viewer',
                phone: null
            }
        ];

        // Dynamic round-robin assignment of Surat Wards to staff users
        smcDeptsInfo.forEach((dept, index) => {
            const deptId = deptMap[dept.name];
            if (!deptId) {
                console.warn(`Warning: Department ${dept.name} not found in DB.`);
                return;
            }

            const phoneSuffix = String(index + 10).padStart(2, '0');
            const assignedWard = allWards[index % allWards.length];

            // 1. Department Head / Authority
            testUsers.push({
                name: `Head of ${dept.name}`,
                email: `authority.${dept.slug}@suratmunicipal.org`,
                password: 'password123',
                role: 'authority',
                designation: `Head of ${dept.name}`,
                department_id: deptId,
                phone: `+9190000001${phoneSuffix}`
            } as any);

            // 2. Field Officer / Staff
            testUsers.push({
                name: `Officer of ${dept.name}`,
                email: `staff.${dept.slug}@suratmunicipal.org`,
                password: 'password123',
                role: 'staff',
                designation: `Officer of ${dept.name}`,
                department_id: deptId,
                ward_id: assignedWard ? assignedWard.id : null,
                phone: `+9190000002${phoneSuffix}`
            } as any);
        });

        // 3. Create or update users in Supabase and PostgreSQL
        for (const userData of testUsers) {
            console.log(`Processing user: ${userData.email} (${userData.role})`);
            
            // 3a. Create/Update in Supabase Auth
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
                const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
                authId = existingUser.users.find((u: any) => u.email === userData.email)?.id;
                
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

            // 3b. Sync to public.users table in PostgreSQL
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

        // 4. Seed Mock Issue Reports in Surat
        console.log('Seeding mock issue reports for live telemetry in Surat...');
        const citizenUser = await User.findOne({ where: { role: 'citizen', email: 'citizen1.surat@test.com' } });
        if (citizenUser && allWards.length > 0) {
            const reporterId = citizenUser.id;
            const mockIssues = [
                {
                    reporter_id: reporterId,
                    ward_id: allWards[0]!.id,
                    location: { type: 'Point', coordinates: [72.821, 21.223] },
                    category: 'Solid Waste Management',
                    description: 'Accumulated waste on the streets near Singanpor.',
                    priority_score: 8.5,
                    status: 'Pending',
                    assigned_department_id: deptMap['Solid Waste Management']
                },
                {
                    reporter_id: reporterId,
                    ward_id: allWards[1 % allWards.length]!.id,
                    location: { type: 'Point', coordinates: [72.855, 21.155] },
                    category: 'Hydraulic',
                    description: 'Main water supply pipe leakage in Pandesara.',
                    priority_score: 9.0,
                    status: 'Resolved',
                    assigned_department_id: deptMap['Hydraulic']
                },
                {
                    reporter_id: reporterId,
                    ward_id: allWards[2 % allWards.length]!.id,
                    location: { type: 'Point', coordinates: [72.906, 21.212] },
                    category: 'Road Development',
                    description: 'Major potholes on road in Varachha main road.',
                    priority_score: 7.2,
                    status: 'Pending',
                    assigned_department_id: deptMap['Road Development']
                },
                {
                    reporter_id: reporterId,
                    ward_id: allWards[3 % allWards.length]!.id,
                    location: { type: 'Point', coordinates: [72.802, 21.232] },
                    category: 'Street Light',
                    description: 'Flickering street pole lights near Adajan.',
                    priority_score: 6.0,
                    status: 'Pending',
                    assigned_department_id: deptMap['Street Light']
                },
                {
                    reporter_id: reporterId,
                    ward_id: allWards[4 % allWards.length]!.id,
                    location: { type: 'Point', coordinates: [72.822, 21.216] },
                    category: 'Drainage',
                    description: 'Sewer blockage causing overflow.',
                    priority_score: 8.0,
                    status: 'Resolved',
                    assigned_department_id: deptMap['Drainage']
                }
            ];

            for (const issueData of mockIssues) {
                if (issueData.assigned_department_id) {
                    await Issue.create(issueData);
                }
            }
            console.log('✔ Seeded mock issues in Surat successfully.');
        } else {
            console.warn('⚠️ No citizen user or Surat wards found in DB. Skipping mock issues seeding.');
        }

        console.log(`Successfully seeded SMC users and departments.`);
    } catch (error) {
        console.error('Error seeding users:', error);
        throw error;
    }
};
