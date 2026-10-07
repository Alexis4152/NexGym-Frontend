import api from './axios';

export const listApartadosPlan = (filtros = {}, page = 0, size = 20) =>
  api.get('/apartados-plan', { params: { ...filtros, page, size } });
export const getApartadoPlan = (id) => api.get(`/apartados-plan/${id}`);
export const cancelarApartadoPlan = (id, data) => api.post(`/apartados-plan/${id}/cancelar`, data);
export const convertirApartadoPlan = (id) => api.post(`/apartados-plan/${id}/convertir`);
