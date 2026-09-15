import api from './axios';

export const listRoles = () => api.get('/roles');
export const createRol = (data) => api.post('/roles', data);
export const updateRol = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRol = (id) => api.delete(`/roles/${id}`);
