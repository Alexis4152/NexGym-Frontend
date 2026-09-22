import api from './axios';

export const listMembresias = (page = 0, size = 20) => api.get('/membresias', { params: { page, size } });
export const listMembresiasPorAlumno = (alumnoId, page = 0, size = 20) =>
  api.get(`/membresias/alumno/${alumnoId}`, { params: { page, size } });
export const listMembresiasVigentesPorAlumno = (alumnoId) => api.get(`/membresias/alumno/${alumnoId}/vigentes`);
export const proximasAVencer = (dias = 7) => api.get('/membresias/proximas-a-vencer', { params: { dias } });
export const createMembresia = (data) => api.post('/membresias', data);
export const renovarMembresia = (id, data) => api.post(`/membresias/${id}/renovar`, data);
export const suspenderMembresia = (id, motivo) => api.post(`/membresias/${id}/suspender`, { motivo });
export const reanudarMembresia = (id) => api.post(`/membresias/${id}/reanudar`);
export const cancelarMembresia = (id, motivo) => api.post(`/membresias/${id}/cancelar`, { motivo });

export const listPagosMembresia = (id) => api.get(`/membresias/${id}/pagos`);
export const registrarPagoMembresia = (id, data) => api.post(`/membresias/${id}/pagos`, data);
export const cancelarPagoMembresia = (id, pagoId, motivo) => api.post(`/membresias/${id}/pagos/${pagoId}/cancelar`, { motivo });
