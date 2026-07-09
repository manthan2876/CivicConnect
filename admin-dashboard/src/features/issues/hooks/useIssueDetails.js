import { useState, useEffect } from 'react';
import { reportsApi } from '../../../services/reportsApi';
import { departmentsApi } from '../../../services/departmentsApi';
import { usersApi } from '../../../services/usersApi';
import { supabase } from '../../../config/supabase';

export const useIssueDetails = (id, onDeleted) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [updatingDeps, setUpdatingDeps] = useState(false);
    const [updatingCategory, setUpdatingCategory] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [repairData, setRepairData] = useState(null);
    const [isSubmittingProof, setIsSubmittingProof] = useState(false);
    const [proofFile, setProofFile] = useState(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchReport();
        fetchDepartments();
        fetchAuditLogs();
        fetchCurrentUser();
    }, [id]);

    useEffect(() => {
        if (report?.ward_id) {
            fetchStaff(report.ward_id, report.assigned_department_id);
        }
        if (report?.status === 'Pending Confirmation' || report?.status === 'Resolved') {
            fetchRepairData();
        }
    }, [report?.ward_id, report?.assigned_department_id, report?.status]);

    const fetchDepartments = async () => {
        try {
            const data = await departmentsApi.getAll();
            setDepartments(data);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const data = await reportsApi.getAudit(id);
            setAuditLogs(data);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        }
    };

    const fetchStaff = async (wardId, deptId) => {
        setLoadingStaff(true);
        try {
            const data = await usersApi.getStaff({ ward_id: wardId, department_id: deptId });
            setStaffMembers(data);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoadingStaff(false);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const profile = await usersApi.getMe();
                setCurrentUser(profile);
            }
        } catch (err) {
            console.error('Failed to fetch current user:', err);
        }
    };

    const fetchRepairData = async () => {
        try {
            const logs = await reportsApi.getAudit(id);
            const resolutionLog = logs.find(log => log.event_type === 'RESOLUTION_SUBMITTED');
            if (resolutionLog) {
                setRepairData(resolutionLog.payload);
            }
        } catch (err) {
            console.error('Failed to fetch repair data:', err);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const data = await reportsApi.getById(id);
            if (data.status === 'Submitted' || !data.status) data.status = 'Pending';
            setReport(data);
            setRemarks(data.remarks || '');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            await reportsApi.update(id, { status: newStatus, remarks });
            fetchReport();
        } catch (err) {
            alert('Update failed: ' + err.message);
        }
    };

    const handleReassign = async (deptId) => {
        try {
            setUpdatingDeps(true);
            await reportsApi.update(id, { assigned_department_id: deptId ? parseInt(deptId) : null });
            fetchReport();
        } catch (err) {
            alert('Reassignment failed: ' + err.message);
        } finally {
            setUpdatingDeps(false);
        }
    };

    const handleAssignStaff = async (staffId) => {
        try {
            setLoadingStaff(true);
            await reportsApi.update(id, { assigned_staff_id: staffId || null });
            fetchReport();
        } catch (err) {
            alert('Staff assignment failed: ' + err.message);
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleCategoryChange = async (newCategory) => {
        if (!window.confirm(`Are you sure you want to change this category to ${newCategory}? This will train the AI.`)) return;
        try {
            setUpdatingCategory(true);
            await reportsApi.update(id, { category: newCategory });
            fetchReport();
        } catch (err) {
            alert('Category update failed: ' + err.message);
        } finally {
            setUpdatingCategory(false);
        }
    };

    const handleStatusAction = async (action) => {
        try {
            if (action === 'start_work') {
                await reportsApi.update(id, { status: 'In Progress' });
            } else if (action === 'approve') {
                await reportsApi.confirmResolution(id);
            } else if (action === 'reject') {
                await reportsApi.rejectResolution(id, { reason: rejectionReason });
                setIsRejecting(false);
            }
            fetchReport();
            fetchAuditLogs();
        } catch (err) {
            alert('Action failed: ' + err.message);
        }
    };

    const handleSubmitProof = async (e) => {
        e.preventDefault();
        if (!proofFile) return alert('Please select a photo');

        try {
            setIsSubmittingProof(true);
            const formData = new FormData();
            formData.append('image', proofFile);
            
            await reportsApi.proposeResolution(id, formData);
            
            setProofFile(null);
            setIsSubmittingProof(false);
            fetchReport();
            fetchAuditLogs();
        } catch (err) {
            alert('Submission failed: ' + err.message);
            setIsSubmittingProof(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
        try {
            await reportsApi.delete(id);
            if (onDeleted) onDeleted();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    return {
        report,
        loading,
        error,
        departments,
        remarks,
        setRemarks,
        updatingDeps,
        updatingCategory,
        auditLogs,
        staffMembers,
        loadingStaff,
        currentUser,
        repairData,
        isSubmittingProof,
        proofFile,
        setProofFile,
        isRejecting,
        setIsRejecting,
        rejectionReason,
        setRejectionReason,
        handleUpdateStatus,
        handleReassign,
        handleAssignStaff,
        handleCategoryChange,
        handleStatusAction,
        handleSubmitProof,
        handleDelete,
        fetchReport
    };
};
