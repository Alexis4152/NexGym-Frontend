import api from './axios';

export const listCategoriasInventario = () => api.get('/inventario/categorias');
export const createCategoriaInventario = (data) => api.post('/inventario/categorias', data);

export const listArticulos = (q = '', page = 0, size = 20) =>
  api.get('/inventario/articulos', { params: { q: q || undefined, page, size } });
export const listStockBajo = () => api.get('/inventario/articulos/stock-bajo');
export const createArticulo = (data) => api.post('/inventario/articulos', data);
export const updateArticulo = (id, data) => api.put(`/inventario/articulos/${id}`, data);
export const deactivateArticulo = (id) => api.delete(`/inventario/articulos/${id}`);
export const ajustarStock = (id, delta, razon) =>
  api.post(`/inventario/articulos/${id}/ajustar-stock`, { delta, razon });
