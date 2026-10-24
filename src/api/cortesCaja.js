import api from './axios';

export const getCorteAbierto = () => api.get('/cortes-caja/abierto');
export const listCortesCaja = (filtros = {}, page = 0, size = 20) =>
  api.get('/cortes-caja', { params: { ...filtros, page, size } });
export const listCajeros = () => api.get('/cortes-caja/cajeros');
export const getCorteCaja = (id) => api.get(`/cortes-caja/${id}`);
export const getCorteCajaResumen = (id) => api.get(`/cortes-caja/${id}/resumen`);
// { cajaRegistradoraId, montoContado, deAcuerdo, confirmacionDiferenciaGrande?, nota? }
export const abrirCorteCaja = (data) => api.post('/cortes-caja/abrir', data);
// { montoContado, notas?, confirmacionDiferenciaGrande? } -- cierre con arqueo
export const cerrarCorteCaja = (id, data) => api.post(`/cortes-caja/${id}/cerrar`, data);
// { metodoConteo, montoContado?, reportadoPorId?, evidenciaUrl?, motivo } -- solo administradores
export const forzarCierreCorte = (id, data) => api.post(`/cortes-caja/${id}/forzar-cierre`, data);
export const listMovimientosCorte = (id) => api.get(`/cortes-caja/${id}/movimientos`);
export const listMovimientosRecibidos = (id) => api.get(`/cortes-caja/${id}/movimientos-recibidos`);
export const registrarMovimientoCorte = (id, data) => api.post(`/cortes-caja/${id}/movimientos`, data);
export const subirComprobanteCorte = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/cortes-caja/comprobantes', fd);
};
