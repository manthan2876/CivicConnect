import { api } from '../utils/api';

export const systemApi = {
    getWards: () => api.get('/system/wards'),
    createWard: (data) => api.post('/system/wards', data),
    updateWard: (id, data) => api.patch(`/system/wards/${id}`, data),
    deleteWard: (id) => api.delete(`/system/wards/${id}`),
    getZones: () => api.get('/system/zones'),
    createZone: (data) => api.post('/system/zones', data),
    updateZone: (id, data) => api.patch(`/system/zones/${id}`, data),
    deleteZone: (id) => api.delete(`/system/zones/${id}`),
    getUlbs: () => api.get('/system/ulb-boundaries'),
    createUlb: (data) => api.post('/system/ulb-boundaries', data),
    updateUlb: (id, data) => api.patch(`/system/ulb-boundaries/${id}`, data),
    deleteUlb: (id) => api.delete(`/system/ulb-boundaries/${id}`),
    wipeData: () => api.post('/system/wipe-data')
};
