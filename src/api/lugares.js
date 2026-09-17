import api from './axios';

export const listLugares = (page = 0, size = 50) => api.get('/lugares', { params: { page, size } });
export const listLugaresActivos = (sucursalId, disciplinaId) =>
  api.get('/lugares/activos', { params: { sucursalId: sucursalId || undefined, disciplinaId: disciplinaId || undefined } });
export const createLugar = (data) => api.post('/lugares', data);
export const updateLugar = (id, data) => api.put(`/lugares/${id}`, data);
export const deactivateLugar = (id) => api.delete(`/lugares/${id}`);
