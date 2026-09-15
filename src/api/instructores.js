import api from './axios';

export const listInstructores = (q = '', page = 0, size = 20) =>
  api.get('/instructores', { params: { q: q || undefined, page, size } });
export const createInstructor = (data) => api.post('/instructores', data);
export const updateInstructor = (id, data) => api.put(`/instructores/${id}`, data);
export const deactivateInstructor = (id) => api.delete(`/instructores/${id}`);
