import { UlbBoundary, Ward, Department, Zone } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureLngLat = (geometry: any) => {
    if (!geometry) return geometry;
    const processRing = (ring: any[]) => {
        return ring.map(coord => {
            // Surat is lat ~21, lng ~72. If coord[0] is around 21, it is latitude, so swap it to standard [lng, lat]
            if (coord[0] < 50 && coord[0] > 10 && coord[1] > 60 && coord[1] < 90) {
                return [coord[1], coord[0]];
            }
            return coord;
        });
    };

    if (geometry.type === 'Polygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(processRing)
        };
    } else if (geometry.type === 'MultiPolygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((poly: any[]) => poly.map(processRing))
        };
    }
    return geometry;
};

export const seedUlbBoundaries = async () => {
    try {
        console.log('--- Seeding Surat Municipal Corporation Data from GeoJSON ---');

        // 1. Seed SMC departments that resolve civic issues
        const smcDepts = [
            { id: '24ba1d92-f1be-4180-94c3-fe5f181afe51', name: 'Road Development', contact_email: 'road.dev@suratmunicipal.org' },
            { id: '8a39163d-019d-415a-b178-8ca16232c905', name: 'Drainage', contact_email: 'drainage@suratmunicipal.org' },
            { id: '20a21024-5b5c-4ad0-84f2-710db1c7d693', name: 'Hydraulic', contact_email: 'hydraulic@suratmunicipal.org' },
            { id: '282b4ac0-9e67-40e9-99d8-b569a0f8f6e0', name: 'Street Light', contact_email: 'streetlight@suratmunicipal.org' },
            { id: '1a6f9e45-aca4-4a6c-800f-31fc7924b775', name: 'Solid Waste Management', contact_email: 'swm@suratmunicipal.org' },
            { id: '3ab9163d-019d-415a-b178-8ca16232c906', name: 'Traffic Cell', contact_email: 'traffic@suratmunicipal.org' },
            { id: '4ab9163d-019d-415a-b178-8ca16232c907', name: 'Bridge Cell', contact_email: 'bridge@suratmunicipal.org' },
            { id: '5ab9163d-019d-415a-b178-8ca16232c908', name: 'BRTS Cell', contact_email: 'brts@suratmunicipal.org' },
            { id: '6ab9163d-019d-415a-b178-8ca16232c909', name: 'Vector Borne Diseases Control', contact_email: 'vector.control@suratmunicipal.org' },
            { id: '7ab9163d-019d-415a-b178-8ca16232c910', name: 'Fire & Emergency Services', contact_email: 'fire@suratmunicipal.org' },
            { id: '8ab9163d-019d-415a-b178-8ca16232c911', name: 'Environment Cell', contact_email: 'env@suratmunicipal.org' },
            { id: '9ab9163d-019d-415a-b178-8ca16232c912', name: 'Air Quality Management Cell', contact_email: 'air.quality@suratmunicipal.org' }
        ];

        for (const dept of smcDepts) {
            await Department.upsert(dept);
        }

        const defaultDeptId = '24ba1d92-f1be-4180-94c3-fe5f181afe51'; // Road Development

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

            const standardGeometry = ensureLngLat(geometry);

            // Dynamically assign geometry to Zone definition if it's currently unassigned
            if (!parentZone.boundary) {
                await parentZone.update({ boundary: standardGeometry });
            }

            // Seed unique structural Ward instance linked to correct administrative zone
            await Ward.findOrCreate({
                where: { name: `${parentZone.name} - ${geoWardName}` },
                defaults: {
                    boundary: standardGeometry,
                    dept_id: defaultDeptId,
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
const isMain = () => {
    if (!process.argv[1]) return false;
    try {
        const scriptPath = fs.realpathSync(process.argv[1]);
        const currentPath = fs.realpathSync(fileURLToPath(import.meta.url));
        return scriptPath === currentPath;
    } catch {
        return false;
    }
};

if (isMain()) {
    seedUlbBoundaries().then(() => {
        console.log('Seeding script process finished.');
        process.exit(0);
    }).catch((err) => {
        console.error('Fatal seeding script failure:', err);
        process.exit(1);
    });
}

