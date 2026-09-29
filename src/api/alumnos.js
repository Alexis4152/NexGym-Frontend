import api from './axios';

export const listAlumnos = (q = '', page = 0, size = 20) =>
  api.get('/alumnos', { params: { q: q || undefined, page, size } });
export const getAlumno = (id) => api.get(`/alumnos/${id}`);
export const createAlumno = (data) => api.post('/alumnos', data);
export const updateAlumno = (id, data) => api.put(`/alumnos/${id}`, data);
export const deactivateAlumno = (id) => api.delete(`/alumnos/${id}`);
export const subirFotoAlumno = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/alumnos/${id}/foto`, formData);
};
