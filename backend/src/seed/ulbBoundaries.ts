import { UlbBoundary, Ward, Department, Zone } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedUlbBoundaries = async () => {
    try {
        console.log('--- Seeding Surat Municipal Corporation Data from GeoJSON ---');

        // 1. Ensure a default Department exists
        const [defaultDept] = await Department.findOrCreate({
            where: { name: 'Public Works Department' },
            defaults: {
                id: '24ba1d92-f1be-4180-94c3-fe5f181afe51',
                contact_email: 'pwd@civicconnect.gov'
            }
        });

        // 2. Seed SMC ULB
        const [smcUlb] = await UlbBoundary.findOrCreate({
            where: { name: 'Surat Municipal Corporation (SMC)' },
            defaults: { geom: { type: 'MultiPolygon', coordinates: [] } }
        });

        // 3. Pre-seed the 9 Official Administrative Zones of Surat
        const officialZonesData = [
            { code: 'WZ', name: 'West Zone' },
            { code: 'CZ', name: 'Central Zone' },
            { code: 'NZ', name: 'North Zone' },
            { code: 'EZA', name: 'East Zone A' },
            { code: 'EZB', name: 'East Zone B' },
            { code: 'SZA', name: 'South Zone A' },
            { code: 'SZB', name: 'South Zone B' },
            { code: 'SWZ', name: 'South West Zone' },
            { code: 'SEZ', name: 'South East Zone' }
        ];

        const zoneLookups: Record<string, any> = {};

        for (const zoneItem of officialZonesData) {
            const [zone] = await Zone.findOrCreate({
                where: { code: zoneItem.code },
                defaults: {
                    name: zoneItem.name,
                    ulb_id: smcUlb.id,
                    boundary: null // Populated later or left as geometry collection placeholder
                }
            });
            zoneLookups[zoneItem.code] = zone;
        }

        // 4. Read and Parse GeoJSON
        const geojsonPath = path.join(__dirname, '../..', 'data', 'wards_surat.geojson');
        if (!fs.existsSync(geojsonPath)) {
            throw new Error(`GeoJSON file not found at expected path: ${geojsonPath}`);
        }

        const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

        // 5. Helper to map Ward metadata to the correct Official Zone Code
        const getOfficialZoneCode = (wardName: string, wardCode: string | number): string => {
            const nameLower = wardName.toLowerCase();
            const codeStr = String(wardCode);

            // Mapping based on official SMC assignment guidelines
            if (nameLower.includes('rander') || nameLower.includes('adajan') || nameLower.includes('pal') || nameLower.includes('ichhapor')) return 'WZ';
            if (nameLower.includes('dabholi') || nameLower.includes('singanpor') || nameLower.includes('katargam') || nameLower.includes('kosad') || codeStr === '8') return 'NZ';
            if (nameLower.includes('nanavat') || nameLower.includes('sayyadpura') || nameLower.includes('begumpura') || nameLower.includes('central')) return 'CZ';
            if (nameLower.includes('varachha') && nameLower.includes('mota')) return 'EZB';
            if (nameLower.includes('varachha') || nameLower.includes('kapodra') || nameLower.includes('puna')) return 'EZA';
            if (nameLower.includes('athwa') || nameLower.includes('vesu') || nameLower.includes('dumas')) return 'SWZ';
            if (nameLower.includes('limbayat') || nameLower.includes('dindoli') || nameLower.includes('godadara')) return 'SEZ';
            if (nameLower.includes('udhna') || nameLower.includes('bhestan') || nameLower.includes('pandesara')) return 'SZA';

            // Fallback strategy based on specific numeric identifiers if strings don't match cleanly
            const numericCode = parseInt(codeStr, 10);
            if ([1, 2, 6, 7, 8].includes(numericCode)) return 'NZ';
            if ([3, 4, 5, 16, 17].includes(numericCode)) return 'EZA';
            if ([9, 10, 11].includes(numericCode)) return 'WZ';
            if ([12, 13, 14, 20].includes(numericCode)) return 'CZ';
            if ([15, 18, 19, 25, 26, 27].includes(numericCode)) return 'SEZ';
            if ([21, 22, 29].includes(numericCode)) return 'SWZ';
            if ([23, 24, 28].includes(numericCode)) return 'SZA';

            return 'CZ'; // Ultimate fallback to Central Zone
        };

        // 6. Iterate through GeoJSON features and link Wards to Zones
        let wardsSeeded = 0;
        for (const feature of geojsonData.features) {
            const { properties, geometry } = feature;

            if (!properties) continue;

            const geoWardCode = properties.wardcode ?? properties.ward_code;
            const geoWardName = properties.wardname ?? properties.ward_name ?? `Ward ${geoWardCode}`;

            if (geoWardCode === undefined || geoWardCode === null) {
                console.warn('Skipping feature due to missing structural ward identifier');
                continue;
            }

            // Determine matching official target zone
            const targetZoneCode = getOfficialZoneCode(geoWardName, geoWardCode);
            const parentZone = zoneLookups[targetZoneCode];

            // Dynamically assign geometry to Zone definition if it's currently unassigned
            if (!parentZone.boundary) {
                await parentZone.update({ boundary: geometry });
            }

            // Seed unique structural Ward instance linked to correct administrative zone
            await Ward.findOrCreate({
                where: { name: `${parentZone.name} - ${geoWardName}` },
                defaults: {
                    boundary: geometry,
                    dept_id: defaultDept.id,
                    ulb_id: smcUlb.id,
                    zone_id: parentZone.id
                }
            });

            wardsSeeded++;
        }

        console.log(`\n--- SMC Seeding Completed Successfully ---`);
        console.log(`✔️ Total Administrative Zones Monitored: 9`);
        console.log(`✔️ Total Local Wards Processed & Linked: ${wardsSeeded}`);
    } catch (error) {
        console.error('Error seeding SMC data from GeoJSON:', error);
    }
};

// =========================================================================
// SELF-EXECUTION ENTRYPOINT FOR TERMINAL INVOCATION
// =========================================================================
seedUlbBoundaries().then(() => {
    console.log('Seeding script process finished.');
    process.exit(0);
}).catch((err) => {
    console.error('Fatal seeding script failure:', err);
    process.exit(1);
});
