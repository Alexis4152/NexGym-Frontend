import api from './axios';

export const listMembresias = (page = 0, size = 20) => api.get('/membresias', { params: { page, size } });
export const listMembresiasPorAlumno = (alumnoId, page = 0, size = 20) =>
  api.get(`/membresias/alumno/${alumnoId}`, { params: { page, size } });
export const proximasAVencer = (dias = 7) => api.get('/membresias/proximas-a-vencer', { params: { dias } });
export const createMembresia = (data) => api.post('/membresias', data);
export const cancelarMembresia = (id) => api.post(`/membresias/${id}/cancelar`);
