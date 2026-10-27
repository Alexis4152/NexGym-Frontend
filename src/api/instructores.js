import api from './axios';

export const listInstructores = (q = '', page = 0, size = 20) =>
  api.get('/instructores', { params: { q: q || undefined, page, size } });
export const createInstructor = (data) => api.post('/instructores', data);
export const updateInstructor = (id, data) => api.put(`/instructores/${id}`, data);
export const deactivateInstructor = (id) => api.delete(`/instructores/${id}`);
export const subirFotoInstructor = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/instructores/${id}/foto`, formData);
};

export const listDocumentosInstructor = (id) => api.get(`/instructores/${id}/documentos`);
/** Un solo diploma por instructor: subir otro reemplaza al anterior. */
export const subirDocumentoInstructor = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/instructores/${id}/documentos`, formData);
};
export const eliminarDocumentoInstructor = (id, documentoId) => api.delete(`/instructores/${id}/documentos/${documentoId}`);
