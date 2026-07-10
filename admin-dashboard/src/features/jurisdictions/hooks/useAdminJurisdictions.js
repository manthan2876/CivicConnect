import { useState, useEffect } from 'react';
import { systemApi } from '../../../services/systemApi';
import { departmentsApi } from '../../../services/departmentsApi';
import { fetchOSMBoundary } from '../utils/overpass';

export const useAdminJurisdictions = () => {
    const [activeTab, setActiveTab] = useState('wards'); // 'wards', 'zones', or 'ulbs'
    const [wards, setWards] = useState([]);
    const [zones, setZones] = useState([]);
    const [ulbs, setUlbs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [fetchingOSM, setFetchingOSM] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('IN');
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [code, setCode] = useState(''); // For Zone creation
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedZone, setSelectedZone] = useState(''); // For Ward assignment
    const [selectedUlb, setSelectedUlb] = useState('');
    const [drawnPoints, setDrawnPoints] = useState([]); // [[lat, lng], ...]
    const [mapCenter, setMapCenter] = useState([21.1702, 72.8311]); // Surat default center

    const [showHelp, setShowHelp] = useState(true);

    useEffect(() => {
        fetchData();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMapCenter([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.warn("Geolocation lookup failed, using default center:", error);
                }
            );
        }
    }, []);

    useEffect(() => {
        setDrawnPoints([]);
    }, [selectedUlb, selectedZone, activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [wardsData, ulbsData, deptsData, zonesData] = await Promise.all([
                systemApi.getWards(),
                systemApi.getUlbs(),
                departmentsApi.getAll(),
                systemApi.getZones().catch(() => [])
            ]);
            setWards(wardsData);
            setUlbs(ulbsData);
            setDepartments(deptsData);
            setZones(zonesData);
        } catch (error) {
            console.error('Failed to fetch jurisdictional data:', error);
            alert('Failed to load data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const isPointInPolygon = (point, polygon) => {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const isPointInMultiPolygon = (point, multiPolygonCoords) => {
        for (const polygon of multiPolygonCoords) {
            const outerRing = polygon[0].map(c => [c[1], c[0]]); // convert [lng, lat] to [lat, lng]
            if (isPointInPolygon(point, outerRing)) {
                return true;
            }
        }
        return false;
    };

    const isPointInZone = (point, zoneBoundary) => {
        if (!zoneBoundary || !zoneBoundary.coordinates) return true;
        const outerRing = zoneBoundary.coordinates[0].map(c => [c[1], c[0]]);
        return isPointInPolygon(point, outerRing);
    };

    const isPointInUlb = (point, ulbGeom) => {
        if (!ulbGeom || !ulbGeom.coordinates) return true;
        if (ulbGeom.type === 'MultiPolygon') {
            return isPointInMultiPolygon(point, ulbGeom.coordinates);
        } else if (ulbGeom.type === 'Polygon') {
            const outerRing = ulbGeom.coordinates[0].map(c => [c[1], c[0]]);
            return isPointInPolygon(point, outerRing);
        }
        return true;
    };

    const handleMapClick = (lat, lng) => {
        const point = [lat, lng];

        if (activeTab === 'zones' && selectedUlb) {
            const activeUlb = ulbs.find(u => u.id.toString() === selectedUlb.toString());
            if (activeUlb && activeUlb.geom) {
                if (!isPointInUlb(point, activeUlb.geom)) {
                    alert('You can only draw zone boundaries inside the selected City (ULB) boundary.');
                    return;
                }
            }
        }

        if (activeTab === 'wards') {
            if (selectedZone) {
                const activeZone = zones.find(z => z.id === selectedZone);
                if (activeZone && activeZone.boundary) {
                    if (!isPointInZone(point, activeZone.boundary)) {
                        alert('You can only draw ward boundaries inside the selected Zone boundary.');
                        return;
                    }
                }
            }
            if (selectedUlb) {
                const activeUlb = ulbs.find(u => u.id.toString() === selectedUlb.toString());
                if (activeUlb && activeUlb.geom) {
                    if (!isPointInUlb(point, activeUlb.geom)) {
                        alert('You can only draw ward boundaries inside the selected City (ULB) boundary.');
                        return;
                    }
                }
            }
        }

        const getDistanceToSegment = (p, p1, p2) => {
            let x = p[0], y = p[1], x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
            let dx = x2 - x1, dy = y2 - y1;
            if (dx === 0 && dy === 0) {
                return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
            }
            let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
            if (t < 0) {
                return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
            } else if (t > 1) {
                return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
            }
            let nearestX = x1 + t * dx;
            let nearestY = y1 + t * dy;
            return Math.sqrt((x - nearestX) * (x - nearestX) + (y - nearestY) * (y - nearestY));
        };

        if (drawnPoints.length >= 3) {
            let minDistance = Infinity;
            let insertIndex = -1;
            const threshold = 0.0008; // Degrees threshold (approx 80-100m)

            for (let i = 0; i < drawnPoints.length; i++) {
                const p1 = drawnPoints[i];
                const p2 = drawnPoints[(i + 1) % drawnPoints.length];
                const dist = getDistanceToSegment(point, p1, p2);
                if (dist < minDistance) {
                    minDistance = dist;
                    insertIndex = i + 1;
                }
            }

            if (minDistance < threshold && insertIndex !== -1) {
                // Insert point between existing segments
                setDrawnPoints(prev => {
                    const next = [...prev];
                    next.splice(insertIndex, 0, point);
                    return next;
                });
                return;
            }
        }

        // Default: append to end
        setDrawnPoints(prev => [...prev, point]);
    };

    const handleImportFromOSM = async () => {
        if (!name) return alert('Please enter a boundary Name first to search on OpenStreetMap.');
        setFetchingOSM(true);
        try {
            const coords = await fetchOSMBoundary(name, selectedCountry);
            setDrawnPoints(coords);
            if (coords.length > 0) {
                setMapCenter(coords[0]);
            }
            alert(`Successfully loaded ${coords.length} points from OpenStreetMap! You can now adjust, insert, or delete points on the map.`);
        } catch (err) {
            alert('Failed to fetch boundary: ' + err.message);
        } finally {
            setFetchingOSM(false);
        }
    };

    const handleMarkerDrag = (index, newLatLng) => {
        const point = [newLatLng.lat, newLatLng.lng];

        // Containment check for the dragged point
        if (activeTab === 'zones' && selectedUlb) {
            const activeUlb = ulbs.find(u => u.id.toString() === selectedUlb.toString());
            if (activeUlb && activeUlb.geom && !isPointInUlb(point, activeUlb.geom)) {
                alert('You cannot move boundary vertices outside the selected City (ULB) boundary.');
                return;
            }
        }

        if (activeTab === 'wards') {
            if (selectedZone) {
                const activeZone = zones.find(z => z.id === selectedZone);
                if (activeZone && activeZone.boundary && !isPointInZone(point, activeZone.boundary)) {
                    alert('You cannot move boundary vertices outside the selected Zone boundary.');
                    return;
                }
            }
            if (selectedUlb) {
                const activeUlb = ulbs.find(u => u.id.toString() === selectedUlb.toString());
                if (activeUlb && activeUlb.geom && !isPointInUlb(point, activeUlb.geom)) {
                    alert('You cannot move boundary vertices outside the selected City (ULB) boundary.');
                    return;
                }
            }
        }

        setDrawnPoints(prev => {
            const next = [...prev];
            next[index] = point;
            return next;
        });
    };

    const handleMarkerDelete = (index) => {
        setDrawnPoints(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleUndo = () => {
        setDrawnPoints(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setDrawnPoints([]);
    };

    const handleCreateJurisdiction = async (e) => {
        e.preventDefault();
        if (!name) return alert('Name is required');
        if (drawnPoints.length < 3) return alert('Please mark at least 3 points on the map to define the boundary.');

        try {
            if (activeTab === 'wards') {
                if (!selectedDept) return alert('Please assign a department to the ward');
                await systemApi.createWard({
                    name,
                    dept_id: selectedDept,
                    ulb_id: selectedUlb ? parseInt(selectedUlb) : null,
                    zone_id: selectedZone ? selectedZone : null,
                    boundaryCoordinates: drawnPoints
                });
            } else if (activeTab === 'zones') {
                if (!code) return alert('Zone code is required');
                await systemApi.createZone({
                    name,
                    code,
                    ulb_id: selectedUlb ? parseInt(selectedUlb) : null,
                    boundaryCoordinates: drawnPoints
                });
            } else {
                await systemApi.createUlb({
                    name,
                    boundaryCoordinates: drawnPoints
                });
            }

            setName('');
            setCode('');
            setDrawnPoints([]);
            setSelectedDept('');
            setSelectedZone('');
            setSelectedUlb('');
            fetchData();
            alert(`${activeTab === 'wards' ? 'Ward' : activeTab === 'zones' ? 'Zone' : 'City (ULB)'} created successfully!`);
        } catch (err) {
            alert('Failed to save boundary: ' + (err.response?.data?.error || err.message));
        }
    };

    return {
        activeTab,
        setActiveTab,
        wards,
        zones,
        ulbs,
        departments,
        loading,
        name,
        setName,
        code,
        setCode,
        selectedDept,
        setSelectedDept,
        selectedZone,
        setSelectedZone,
        selectedUlb,
        setSelectedUlb,
        drawnPoints,
        setDrawnPoints,
        mapCenter,
        showHelp,
        setShowHelp,
        fetchData,
        handleMapClick,
        handleUndo,
        handleClear,
        handleCreateJurisdiction,
        fetchingOSM,
        handleImportFromOSM,
        handleMarkerDrag,
        handleMarkerDelete,
        selectedCountry,
        setSelectedCountry
    };
};
