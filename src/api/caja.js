import api from './axios';

export const listCategoriasMovimiento = (tipo) => api.get('/caja/categorias', { params: { tipo } });
export const createCategoriaMovimiento = (data) => api.post('/caja/categorias', data);
export const listMovimientos = (desde, hasta, page = 0, size = 20, usuarioId, sucursalId) =>
  api.get('/caja/movimientos', { params: { desde, hasta, usuarioId: usuarioId || undefined, sucursalId: sucursalId || undefined, page, size } });
export const registrarIngreso = (data) => api.post('/caja/ingresos', data);

// multipart: el comprobante (PDF/imagen) es opcional -- sin el, el egreso nace
// PENDIENTE de aprobacion (ver CajaService#registrarMovimiento en el backend).
export const registrarEgreso = (data, comprobante) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') formData.append(key, value);
  });
  if (comprobante) formData.append('comprobante', comprobante);
  return api.post('/caja/egresos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const listEgresosPendientes = (page = 0, size = 20) =>
  api.get('/caja/egresos/pendientes', { params: { page, size } });
export const aprobarMovimiento = (id) => api.post(`/caja/movimientos/${id}/aprobar`);
export const rechazarMovimiento = (id, motivo) => api.post(`/caja/movimientos/${id}/rechazar`, { motivo });
