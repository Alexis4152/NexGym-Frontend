import api from './axios';

export const listCentros = () => api.get('/centros');
export const listCentrosDisponibles = () => api.get('/centros/disponibles');
export const getCentro = (id) => api.get(`/centros/${id}`);
export const createCentro = (data) => api.post('/centros', data);
export const updateCentro = (id, data) => api.put(`/centros/${id}`, data);
export const uploadLogoCentro = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/centros/${id}/logo`, formData);
};
