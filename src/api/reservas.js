import api from './axios';

export const listReservas = (page = 0, size = 20) => api.get('/reservas', { params: { page, size } });
export const listReservasPorAlumno = (alumnoId, page = 0, size = 20) =>
  api.get(`/reservas/alumno/${alumnoId}`, { params: { page, size } });
export const createReserva = (data) => api.post('/reservas', data);
export const cambiarEstadoReserva = (id, estado) => api.put(`/reservas/${id}/estado`, null, { params: { estado } });
