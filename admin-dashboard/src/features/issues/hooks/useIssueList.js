import { useState, useEffect } from 'react';
import { reportsApi } from '../../../services/reportsApi';
import { systemApi } from '../../../services/systemApi';

export const useIssueList = (user) => {
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterZone, setFilterZone] = useState('All');
    const [filterWard, setFilterWard] = useState('All');
    
    const [issues, setIssues] = useState([]);
    const [zones, setZones] = useState([]);
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);

    const isAuthority = user?.role === 'authority';
    const isStaff = user?.role === 'staff';

    // Fetch initial issues
    useEffect(() => {
        if (!user) return;
        const params = {};
        if (isAuthority) params.ward_id = user.ward_id;
        if (isStaff) params.assigned_staff_id = user.id;

        reportsApi.getAll(params)
            .then(data => {
                setIssues(data.map(i => ({
                    id: i.id,
                    title: i.category,
                    description: i.location && i.location.coordinates
                        ? `Reported at ${i.location.coordinates[1]}, ${i.location.coordinates[0]}`
                        : 'Location unavailable',
                    category: i.category,
                    status: i.status,
                    ward_id: i.ward_id,
                    assigned_staff_id: i.assigned_staff_id,
                    date: (i.createdAt || i.timestamp || i.reported_at) ? new Date(i.createdAt || i.timestamp || i.reported_at).toLocaleDateString() : 'Unknown',
                    fusion_final_category: i.fusion_final_category
                })));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching admin issues:', err);
                setLoading(false);
            });
    }, [user?.id, user?.role, user?.ward_id]);

    // Fetch Zones and Wards for filters
    useEffect(() => {
        systemApi.getZones().then(setZones).catch(console.error);
        systemApi.getWards().then(setWards).catch(console.error);
    }, []);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await reportsApi.update(id, { status: newStatus });
            setIssues(issues.map(issue =>
                issue.id === id ? { ...issue, status: newStatus } : issue
            ));
        } catch (err) {
            alert('Update failed: ' + err.message);
        }
    };

    const handleBulkAction = async (newStatus) => {
        try {
            const res = await reportsApi.bulkUpdate({
                ids: selectedIds,
                status: newStatus
            });
            alert(res.message);
            setIssues(issues.map(i =>
                selectedIds.includes(i.id) ? { ...i, status: newStatus } : i
            ));
            setSelectedIds([]);
        } catch (err) {
            alert('Bulk action failed: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return;
        try {
            await reportsApi.delete(id);
            setIssues(issues.filter(issue => issue.id !== id));
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredIssues = issues.filter(issue => {
        const matchesStatus = filterStatus === 'All' || issue.status === filterStatus;
        const matchesCategory = filterCategory === 'All' || issue.category === filterCategory;
        const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.category.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesZone = true;
        let matchesWard = true;

        if (filterWard !== 'All') {
            matchesWard = issue.ward_id === filterWard;
        } else if (filterZone !== 'All') {
            const wardIdsInZone = wards.filter(w => w.zone_id === filterZone).map(w => w.id);
            matchesZone = wardIdsInZone.includes(issue.ward_id);
        }

        return matchesStatus && matchesCategory && matchesSearch && matchesZone && matchesWard;
    });

    const categories = ['All', ...new Set(issues.map(i => i.category))];

    return {
        filterStatus,
        setFilterStatus,
        filterCategory,
        setFilterCategory,
        searchTerm,
        setSearchTerm,
        filterZone,
        setFilterZone,
        filterWard,
        setFilterWard,
        zones,
        wards,
        issues,
        loading,
        selectedIds,
        setSelectedIds,
        filteredIssues,
        categories,
        handleUpdateStatus,
        handleBulkAction,
        handleDelete,
        toggleSelection
    };
};
