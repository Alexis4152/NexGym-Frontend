import api from './axios';

export const listMembresiaPlanes = (page = 0, size = 20) => api.get('/membresia-planes', { params: { page, size } });
export const listMembresiaPlanesActivos = () => api.get('/membresia-planes/activos');
export const createMembresiaPlan = (data) => api.post('/membresia-planes', data);
export const updateMembresiaPlan = (id, data) => api.put(`/membresia-planes/${id}`, data);
export const deactivateMembresiaPlan = (id) => api.delete(`/membresia-planes/${id}`);
