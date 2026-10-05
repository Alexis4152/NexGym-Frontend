import api from './axios';

export const listCategoriasInventario = () => api.get('/inventario/categorias');
export const createCategoriaInventario = (data) => api.post('/inventario/categorias', data);

export const listArticulos = (q = '', page = 0, size = 20, categoriaId = '', soloStockBajo = false, sucursalId = '') =>
  api.get('/inventario/articulos', { params: { q: q || undefined, categoriaId: categoriaId || undefined, soloStockBajo, sucursalId: sucursalId || undefined, page, size } });
export const listStockBajo = (sucursalId = '') => api.get('/inventario/articulos/stock-bajo', { params: { sucursalId: sucursalId || undefined } });
export const buscarArticuloPorCodigoBarras = (codigo) =>
  api.get(`/inventario/articulos/por-codigo/${encodeURIComponent(codigo)}`);
export const buscarEnOtrasSucursales = (q) =>
  api.get('/inventario/articulos/otras-sucursales', { params: { q } });
export const createArticulo = (data) => api.post('/inventario/articulos', data);
export const updateArticulo = (id, data) => api.put(`/inventario/articulos/${id}`, data);
export const deactivateArticulo = (id) => api.delete(`/inventario/articulos/${id}`);
export const ajustarStock = (id, delta, razon) =>
  api.post(`/inventario/articulos/${id}/ajustar-stock`, { delta, razon });

export const listImagenesArticulo = (id) => api.get(`/inventario/articulos/${id}/imagenes`);
export const subirImagenArticulo = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/inventario/articulos/${id}/imagenes`, formData);
};
export const marcarImagenPrincipal = (id, imagenId) => api.put(`/inventario/articulos/${id}/imagenes/${imagenId}/principal`);
export const eliminarImagenArticulo = (id, imagenId) => api.delete(`/inventario/articulos/${id}/imagenes/${imagenId}`);
