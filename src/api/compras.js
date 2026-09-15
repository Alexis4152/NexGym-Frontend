import api from './axios';

export const listCompras = (page = 0, size = 20) => api.get('/compras', { params: { page, size } });
export const createCompra = (data) => api.post('/compras', data);
export const marcarCompraRealizada = (id) => api.post(`/compras/${id}/marcar-realizada`);
