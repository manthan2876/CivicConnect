import { UlbBoundary, Ward, Department, Zone, sequelize } from '../config/db.js';

export const seedUlbBoundaries = async () => {
    try {
        console.log('--- Seeding ULB Boundaries & Wards ---');

        // 1. Ensure a default Department exists
        const [defaultDept] = await Department.findOrCreate({
            where: { id: '24ba1d92-f1be-4180-94c3-fe5f181afe51' },
            defaults: { 
                name: 'Public Works Department',
                contact_email: 'pwd@civicconnect.gov' 
            }
        });

        // 2. Define standard boundaries
        const delhiCoords = [
            [76.8, 28.4], [77.4, 28.4], [77.4, 28.9], [76.8, 28.9], [76.8, 28.4]
        ];
        const ranchiCoords = [
            [85.2, 23.2], [85.5, 23.2], [85.5, 23.5], [85.2, 23.5], [85.2, 23.2]
        ];
        const mumbaiCoords = [
            [72.7, 18.8], [73.0, 18.8], [73.0, 19.3], [72.7, 19.3], [72.7, 18.8]
        ];
        const sandboxCoords = [
            [72.8, 22.4], [73.2, 22.4], [73.2, 22.8], [72.8, 22.8], [72.8, 22.4]
        ];
        const gujaratCoords = [
            [68.0, 20.0], [74.5, 20.0], [74.5, 25.0], [68.0, 25.0], [68.0, 20.0]
        ];

        const regions = [
            { name: 'Municipal Corporation of Delhi (MCD)', coords: delhiCoords, wardName: 'Ward 01 - Delhi Central' },
            { name: 'Ranchi Municipal Corporation', coords: ranchiCoords, wardName: 'Ward A-1 - Ranchi Main' },
            { name: 'Brihanmumbai Municipal Corporation (BMC)', coords: mumbaiCoords, wardName: 'Ward K/West - Mumbai' },
            { name: 'Development Sandbox', coords: sandboxCoords, wardName: 'Dev Ward - User Location' },
            { name: 'Gujarat Municipal Corporation', coords: gujaratCoords, wardName: 'Gujarat State Ward' }
        ];

        for (const region of regions) {
            const polygon = {
                type: 'Polygon',
                coordinates: [region.coords]
            };

            // Seed ULB
            await UlbBoundary.findOrCreate({
                where: { name: region.name },
                defaults: { geom: { type: 'MultiPolygon', coordinates: [[region.coords]] } }
            });

            // Seed Ward (Required for findWardId logic)
            await Ward.findOrCreate({
                where: { name: region.wardName },
                defaults: { 
                    boundary: polygon,
                    dept_id: defaultDept.id
                }
            });
        }

        // 3. Seed Surat Municipal Corporation (SMC) with Zones and Wards
        console.log('--- Seeding Surat Municipal Corporation Hierarchy ---');
        const smcCoords = [
            [72.75, 21.10], [72.90, 21.10], [72.90, 21.25], [72.75, 21.25], [72.75, 21.10]
        ];

        const [smcUlb] = await UlbBoundary.findOrCreate({
            where: { name: 'Surat Municipal Corporation (SMC)' },
            defaults: { geom: { type: 'MultiPolygon', coordinates: [[smcCoords]] } }
        });

        const smcUlbId = smcUlb.id;

        const smcZones = [
            {
                name: 'Central Zone',
                code: 'CZ',
                coords: [[72.82, 21.18], [72.84, 21.18], [72.84, 21.20], [72.82, 21.20], [72.82, 21.18]],
                wards: [
                    { name: 'Nanpura', coords: [[72.821, 21.181], [72.830, 21.181], [72.830, 21.199], [72.821, 21.199], [72.821, 21.181]] },
                    { name: 'Chowk Bazar', coords: [[72.831, 21.181], [72.839, 21.181], [72.839, 21.199], [72.831, 21.199], [72.831, 21.181]] }
                ]
            },
            {
                name: 'West Zone',
                code: 'WZ',
                coords: [[72.76, 21.18], [72.81, 21.18], [72.81, 21.23], [72.76, 21.23], [72.76, 21.18]],
                wards: [
                    { name: 'Adajan', coords: [[72.77, 21.19], [72.80, 21.19], [72.80, 21.22], [72.77, 21.22], [72.77, 21.19]] },
                    { name: 'Rander', coords: [[72.761, 21.181], [72.769, 21.181], [72.769, 21.229], [72.761, 21.229], [72.761, 21.181]] }
                ]
            },
            {
                name: 'North Zone',
                code: 'NZ',
                coords: [[72.81, 21.20], [72.85, 21.20], [72.85, 21.24], [72.81, 21.24], [72.81, 21.20]],
                wards: [
                    { name: 'Katargam', coords: [[72.811, 21.201], [72.830, 21.201], [72.830, 21.239], [72.811, 21.239], [72.811, 21.201]] },
                    { name: 'Ved-Dabholi', coords: [[72.831, 21.201], [72.849, 21.201], [72.849, 21.239], [72.831, 21.239], [72.831, 21.201]] }
                ]
            },
            {
                name: 'East Zone - A',
                code: 'EZA',
                coords: [[72.85, 21.18], [72.89, 21.18], [72.89, 21.22], [72.85, 21.22], [72.85, 21.18]],
                wards: [
                    { name: 'Varachha', coords: [[72.851, 21.181], [72.870, 21.181], [72.870, 21.219], [72.851, 21.219], [72.851, 21.181]] },
                    { name: 'Kapodra', coords: [[72.871, 21.181], [72.889, 21.181], [72.889, 21.219], [72.871, 21.219], [72.871, 21.181]] }
                ]
            },
            {
                name: 'East Zone - B',
                code: 'EZB',
                coords: [[72.85, 21.22], [72.89, 21.22], [72.89, 21.25], [72.85, 21.25], [72.85, 21.22]],
                wards: [
                    { name: 'Sarthana', coords: [[72.851, 21.221], [72.870, 21.221], [72.870, 21.249], [72.851, 21.249], [72.851, 21.221]] },
                    { name: 'Simada', coords: [[72.871, 21.221], [72.889, 21.221], [72.889, 21.249], [72.871, 21.249], [72.871, 21.221]] }
                ]
            },
            {
                name: 'South East Zone',
                code: 'SEZ',
                coords: [[72.84, 21.14], [72.88, 21.14], [72.88, 21.18], [72.84, 21.18], [72.84, 21.14]],
                wards: [
                    { name: 'Limbayat', coords: [[72.841, 21.141], [72.860, 21.141], [72.860, 21.179], [72.841, 21.179], [72.841, 21.141]] },
                    { name: 'Umarwada', coords: [[72.861, 21.141], [72.879, 21.141], [72.879, 21.179], [72.861, 21.179], [72.861, 21.141]] }
                ]
            },
            {
                name: 'South Zone - A',
                code: 'SZA',
                coords: [[72.80, 21.13], [72.84, 21.13], [72.84, 21.17], [72.80, 21.17], [72.80, 21.13]],
                wards: [
                    { name: 'Udhna', coords: [[72.801, 21.131], [72.820, 21.131], [72.820, 21.169], [72.801, 21.169], [72.801, 21.131]] },
                    { name: 'Pandesara', coords: [[72.821, 21.131], [72.839, 21.131], [72.839, 21.169], [72.821, 21.169], [72.821, 21.131]] }
                ]
            },
            {
                name: 'South Zone - B',
                code: 'SZB',
                coords: [[72.84, 21.10], [72.88, 21.10], [72.88, 21.14], [72.84, 21.14], [72.84, 21.10]],
                wards: [
                    { name: 'Dindoli', coords: [[72.841, 21.101], [72.860, 21.101], [72.860, 21.139], [72.841, 21.139], [72.841, 21.101]] }
                ]
            },
            {
                name: 'South West Zone',
                code: 'SWZ',
                coords: [[72.76, 21.12], [72.81, 21.12], [72.81, 21.17], [72.76, 21.17], [72.76, 21.12]],
                wards: [
                    { name: 'Athwa', coords: [[72.761, 21.121], [72.785, 21.121], [72.785, 21.169], [72.761, 21.169], [72.761, 21.121]] },
                    { name: 'Althan', coords: [[72.786, 21.121], [72.809, 21.121], [72.809, 21.169], [72.786, 21.169], [72.786, 21.121]] }
                ]
            }
        ];

        for (const z of smcZones) {
            // Seed Zone
            const [zone] = await Zone.findOrCreate({
                where: { code: z.code },
                defaults: {
                    name: z.name,
                    ulb_id: smcUlbId,
                    boundary: {
                        type: 'Polygon',
                        coordinates: [z.coords]
                    }
                }
            });

            // Seed Wards for Zone
            for (const w of z.wards) {
                await Ward.findOrCreate({
                    where: { name: `${z.name} - ${w.name}` },
                    defaults: {
                        boundary: {
                            type: 'Polygon',
                            coordinates: [w.coords]
                        },
                        dept_id: defaultDept.id,
                        ulb_id: smcUlbId,
                        zone_id: zone.id
                    }
                });
            }
        }

        console.log('--- ULB & Ward Seeding Success ---');
    } catch (error) {
        console.error('Error seeding ULB boundaries:', error);
    }
};
