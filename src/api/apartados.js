import api from './axios';

export const listApartados = (filtros = {}, page = 0, size = 20) =>
  api.get('/apartados', { params: { ...filtros, page, size } });
export const getApartado = (id) => api.get(`/apartados/${id}`);
export const confirmarApartado = (id, data) => api.post(`/apartados/${id}/confirmar`, data);
export const completarApartado = (id, data) => api.post(`/apartados/${id}/completar`, data);
export const cancelarApartado = (id, data) => api.post(`/apartados/${id}/cancelar`, data);
export const quitarItemApartado = (id, itemId) => api.delete(`/apartados/${id}/items/${itemId}`);
// { productos, planes }: pendientes de atender, para el badge del menu y el aviso de nuevos.
export const getApartadosPendientes = () => api.get('/apartados/pendientes');
