import api from './axios';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const refresh = () => api.post('/auth/refresh');
export const logout = () => api.post('/auth/logout');
export const me = () => api.get('/auth/me');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });
