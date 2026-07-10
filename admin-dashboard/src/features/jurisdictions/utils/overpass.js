export const fetchOSMBoundary = async (cityName, countryCode = 'IN') => {
    // Overpass QL Query: Search within the specified country area
    const query = `
        [out:json][timeout:35];
        area["ISO3166-1"="${countryCode}"]->.searchArea;
        (
          relation["boundary"="administrative"]["name"="${cityName}"](area.searchArea);
        );
        out geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
    });

    if (!response.ok) throw new Error('Failed to fetch from OpenStreetMap');
    const data = await response.json();

    const relation = data.elements.find(el => el.type === 'relation');
    if (!relation || !relation.members) {
        throw new Error(`No administrative boundary found for "${cityName}"`);
    }

    // Stitch member ways together to form a continuous polygon outer ring
    const outerWays = relation.members.filter(m => m.role === 'outer');
    if (outerWays.length === 0) {
        throw new Error('No outer boundary members found');
    }

    // Collect all points from the ways
    let coordinates = [];
    
    // Stitch ways end-to-end
    outerWays.forEach(way => {
        if (way.geometry) {
            way.geometry.forEach(pt => {
                coordinates.push([pt.lat, pt.lon]); // Leaflet format [lat, lng]
            });
        }
    });

    // Remove consecutive duplicates if any
    coordinates = coordinates.filter((pt, idx, self) => 
        idx === 0 || pt[0] !== self[idx-1][0] || pt[1] !== self[idx-1][1]
    );

    if (coordinates.length === 0) {
        throw new Error('Boundary has no valid coordinates');
    }

    // Simplify coordinates if they are too dense to keep map and DB performant
    return simplifyCoordinates(coordinates, 0.0005);
};

// Ramer-Douglas-Peucker simplification algorithm to optimize performance
const simplifyCoordinates = (points, tolerance) => {
    if (points.length <= 2) return points;
    const sqTolerance = tolerance * tolerance;

    const simplifyDPStep = (pts, first, last, sqTol, simplified) => {
        let maxSqDist = sqTol;
        let index = -1;

        for (let i = first + 1; i < last; i++) {
            const sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTol) {
            if (index - first > 1) simplifyDPStep(pts, first, index, sqTol, simplified);
            simplified.push(pts[index]);
            if (last - index > 1) simplifyDPStep(pts, index, last, sqTol, simplified);
        }
    };

    const getSqSegDist = (p, p1, p2) => {
        let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
        if (dx !== 0 || dy !== 0) {
            let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = p2[0]; y = p2[1]; }
            else if (t > 0) { x += dx * t; y += dy * t; }
        }
        dx = p[0] - x; dy = p[1] - y;
        return dx * dx + dy * dy;
    };

    const simplified = [points[0]];
    simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
};
