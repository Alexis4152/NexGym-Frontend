import api from './axios';

export const getQzCertificate = () => api.get('/qz/certificate');
export const signQzData = (data) => api.post('/qz/sign', { data });
