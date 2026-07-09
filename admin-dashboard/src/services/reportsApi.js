import { api } from '../utils/api';

const qs = (params) => {
    if (!params) return '';
    const filtered = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return filtered.length ? `?${filtered.join('&')}` : '';
};

export const reportsApi = {
    getStats: () => api.get('/reports/stats'),
    getGeoJSON: () => api.get('/reports/geojson'),
    getAll: (params) => api.get(`/reports${qs(params)}`),
    getKPIs: (params) => api.get(`/reports/kpi${qs(params)}`),
    getById: (id) => api.get(`/reports/${id}`),
    update: (id, data) => api.patch(`/reports/${id}`, data),
    delete: (id) => api.delete(`/reports/${id}`),
    getAudit: (id) => api.get(`/reports/${id}/audit`),
    proposeResolution: (id, formData) => api.post(`/reports/${id}/propose-resolution`, formData),
    confirmResolution: (id) => api.post(`/reports/${id}/confirm-resolution`),
    rejectResolution: (id, data) => api.post(`/reports/${id}/reject-resolution`, data),
    bulkUpdate: (data) => api.patch('/reports/bulk-update', data),
    
    // AI Retraining
    getRetrainingQueue: () => api.get('/reports/retraining-queue'),
    updateRetrainingStatus: (id, status) => api.patch(`/reports/retraining-queue/${id}`, { status }),
    exportRetrainingUrl: () => `${api.getBaseUrl()}/reports/retraining-queue/export`
};
