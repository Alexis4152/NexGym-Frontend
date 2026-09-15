import api from './axios';

export const listClases = (page = 0, size = 50) => api.get('/clases', { params: { page, size } });
export const listClasesActivas = () => api.get('/clases/activas');
export const createClase = (data) => api.post('/clases', data);
export const updateClase = (id, data) => api.put(`/clases/${id}`, data);
export const deactivateClase = (id) => api.delete(`/clases/${id}`);
