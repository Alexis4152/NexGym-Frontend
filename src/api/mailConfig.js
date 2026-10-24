import api from './axios';

export const getMailConfig = () => api.get('/admin/mail-config');
export const updateMailConfig = (data) => api.put('/admin/mail-config', data);
export const testMailConfig = () => api.post('/admin/mail-config/test');
