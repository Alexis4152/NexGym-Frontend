import api from './axios';

export const listCentros = () => api.get('/centros');
export const getCentro = (id) => api.get(`/centros/${id}`);
export const createCentro = (data) => api.post('/centros', data);
export const updateCentro = (id, data) => api.put(`/centros/${id}`, data);
