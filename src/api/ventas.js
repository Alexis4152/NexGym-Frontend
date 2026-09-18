import api from './axios';

export const listVentas = (page = 0, size = 20) => api.get('/ventas', { params: { page, size } });
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const getVentaTicketEscPos = (id) => api.get(`/ventas/${id}/ticket-escpos`);
export const createVenta = (data) => api.post('/ventas', data);
export const cancelarVenta = (id) => api.delete(`/ventas/${id}`);
