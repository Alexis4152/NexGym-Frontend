import api from './axios';

export const listUsuarios = (page = 0, size = 20) => api.get('/usuarios', { params: { page, size } });
export const createUsuario = (data) => api.post('/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const deactivateUsuario = (id) => api.delete(`/usuarios/${id}`);
