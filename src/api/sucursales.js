import api from './axios';

export const listSucursales = (page = 0, size = 50) => api.get('/sucursales', { params: { page, size } });
export const listSucursalesActivas = () => api.get('/sucursales/activas');
export const createSucursal = (data) => api.post('/sucursales', data);
export const updateSucursal = (id, data) => api.put(`/sucursales/${id}`, data);
export const deactivateSucursal = (id) => api.delete(`/sucursales/${id}`);
