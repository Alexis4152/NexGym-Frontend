import api from './axios';

export const listMembresias = (page = 0, size = 20) => api.get('/membresias', { params: { page, size } });
export const listMembresiasPorAlumno = (alumnoId, page = 0, size = 20) =>
  api.get(`/membresias/alumno/${alumnoId}`, { params: { page, size } });
export const listMembresiasVigentesPorAlumno = (alumnoId) => api.get(`/membresias/alumno/${alumnoId}/vigentes`);
export const proximasAVencer = (dias = 7) => api.get('/membresias/proximas-a-vencer', { params: { dias } });
export const createMembresia = (data) => api.post('/membresias', data);
// Como arrancaria la vigencia si se da de alta ahora (regla de clase disponible hoy).
export const getInicioPrevisto = ({ planId, alumnoId, disciplinaIds, sucursalId }) =>
  api.get('/membresias/inicio-previsto', {
    params: {
      planId,
      alumnoId: alumnoId || undefined,
      // "1,2,3": Spring lo convierte solo a Set<Long> (axios mandaria disciplinaIds[]=...)
      disciplinaIds: disciplinaIds?.length ? disciplinaIds.join(',') : undefined,
      sucursalId: sucursalId || undefined,
    },
  });
// Ticket de la membresia para la impresora termica (ESC/POS en hex, igual que ventas).
export const getMembresiaTicketEscPos = (id) => api.get(`/membresias/${id}/ticket-escpos`);
export const renovarMembresia = (id, data) => api.post(`/membresias/${id}/renovar`, data);
export const suspenderMembresia = (id, motivo) => api.post(`/membresias/${id}/suspender`, { motivo });
export const reanudarMembresia = (id) => api.post(`/membresias/${id}/reanudar`);
export const cancelarMembresia = (id, motivo) => api.post(`/membresias/${id}/cancelar`, { motivo });

export const listPagosMembresia = (id) => api.get(`/membresias/${id}/pagos`);
export const registrarPagoMembresia = (id, data) => api.post(`/membresias/${id}/pagos`, data);
export const cancelarPagoMembresia = (id, pagoId, motivo) => api.post(`/membresias/${id}/pagos/${pagoId}/cancelar`, { motivo });
