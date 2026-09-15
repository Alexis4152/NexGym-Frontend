import api from './axios';

export const listDisciplinas = (page = 0, size = 50) => api.get('/disciplinas', { params: { page, size } });
export const listDisciplinasActivas = () => api.get('/disciplinas/activas');
export const createDisciplina = (data) => api.post('/disciplinas', data);
export const updateDisciplina = (id, data) => api.put(`/disciplinas/${id}`, data);
export const deactivateDisciplina = (id) => api.delete(`/disciplinas/${id}`);
