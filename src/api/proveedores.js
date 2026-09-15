import api from './axios';

export const listProveedores = (page = 0, size = 20) => api.get('/proveedores', { params: { page, size } });
export const createProveedor = (data) => api.post('/proveedores', data);
export const updateProveedor = (id, data) => api.put(`/proveedores/${id}`, data);
export const deactivateProveedor = (id) => api.delete(`/proveedores/${id}`);
