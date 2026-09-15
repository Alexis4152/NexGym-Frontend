import api from './axios';

export const listCategoriasMovimiento = (tipo) => api.get('/caja/categorias', { params: { tipo } });
export const createCategoriaMovimiento = (data) => api.post('/caja/categorias', data);
export const listMovimientos = (desde, hasta, page = 0, size = 20) =>
  api.get('/caja/movimientos', { params: { desde, hasta, page, size } });
export const registrarIngreso = (data) => api.post('/caja/ingresos', data);
export const registrarEgreso = (data) => api.post('/caja/egresos', data);
