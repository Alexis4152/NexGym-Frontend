import api from './axios';

export const listVentas = (filtros = {}, page = 0, size = 20) =>
  api.get('/ventas', { params: { ...filtros, page, size } });
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const getVentaTicketEscPos = (id) => api.get(`/ventas/${id}/ticket-escpos`);
export const createVenta = (data) => api.post('/ventas', data);
export const cancelarVenta = (id) => api.delete(`/ventas/${id}`);
