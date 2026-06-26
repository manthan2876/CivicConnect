import { useState, useEffect } from 'react';
import { systemApi } from '../../../services/systemApi';
import { departmentsApi } from '../../../services/departmentsApi';

export const useAdminJurisdictions = () => {
    const [activeTab, setActiveTab] = useState('wards'); // 'wards', 'zones', or 'ulbs'
    const [wards, setWards] = useState([]);
    const [zones, setZones] = useState([]);
    const [ulbs, setUlbs] = useState([]);
    const [departments, setDepartments] = useState([]);
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

    const handleMapClick = (lat, lng) => {
        setDrawnPoints(prev => [...prev, [lat, lng]]);
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
        handleCreateJurisdiction
    };
};
