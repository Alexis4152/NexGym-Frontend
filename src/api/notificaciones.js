import api from './axios';

export const listNotificaciones = (soloNoLeidas = false, page = 0, size = 20) =>
  api.get('/notificaciones', { params: { soloNoLeidas, page, size } });
export const countNoLeidas = () => api.get('/notificaciones/no-leidas/count');
export const marcarLeida = (id) => api.post(`/notificaciones/${id}/leer`);
export const marcarTodasLeidas = () => api.post('/notificaciones/leer-todas');
export const historialPorAlumno = (alumnoId) => api.get(`/notificaciones/alumno/${alumnoId}`);

// Disparo manual de los jobs programados (solo SUPER_ADMIN, solo para pruebas).
export const ejecutarSchedulerMembresias = () => api.post('/notificaciones/scheduler/membresias');
export const ejecutarSchedulerRecordatorios = () => api.post('/notificaciones/scheduler/recordatorios-clase');
