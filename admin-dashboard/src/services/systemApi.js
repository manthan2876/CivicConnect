import { api } from '../utils/api';

export const systemApi = {
    getWards: () => api.get('/system/wards'),
    createWard: (data) => api.post('/system/wards', data),
    getZones: () => api.get('/system/zones'),
    createZone: (data) => api.post('/system/zones', data),
    getUlbs: () => api.get('/system/ulb-boundaries'),
    createUlb: (data) => api.post('/system/ulb-boundaries', data),
    wipeData: () => api.post('/system/wipe-data')
};
