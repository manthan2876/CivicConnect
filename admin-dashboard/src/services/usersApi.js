import { api } from '../utils/api';

const qs = (params) => {
    if (!params) return '';
    const filtered = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return filtered.length ? `?${filtered.join('&')}` : '';
};

export const usersApi = {
    // Self / Auth Profile Actions
    updateProfile: (id, data) => api.patch(`/auth/update-profile/${id}`, data),
    changePassword: (data) => api.post('/auth/change-password', data),
    getMe: () => api.get('/users/me'),
    uploadAvatar: (formData) => api.post('/users/avatar', formData),

    // Administrative User Actions
    getAll: (params) => api.get(`/users${qs(params)}`),
    getLeaderboard: () => api.get('/users/leaderboard'),
    getStaff: (params) => api.get(`/users/staff${qs(params)}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.patch(`/users/${id}`, data),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`)
};
