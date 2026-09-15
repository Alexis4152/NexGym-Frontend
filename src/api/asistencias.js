import api from './axios';

export const listAsistencias = (page = 0, size = 20) => api.get('/asistencias', { params: { page, size } });
export const registrarAsistencia = (data) => api.post('/asistencias', data);
