import api from './axios';

export const listApartadosPlan = (filtros = {}, page = 0, size = 20) =>
  api.get('/apartados-plan', { params: { ...filtros, page, size } });
export const getApartadoPlan = (id) => api.get(`/apartados-plan/${id}`);
export const cancelarApartadoPlan = (id, data) => api.post(`/apartados-plan/${id}/cancelar`, data);
// Alumnos del centro que podrian ser el cliente del apartado (mismo correo/telefono/nombre).
export const alumnosCoincidentes = (id) => api.get(`/apartados-plan/${id}/alumnos-coincidentes`);
// { alumnoId } o { nuevoAlumno: {...} } + disciplinaIds, fechaInicio, descuento, montoPagoAdicional, metodoPago
export const convertirApartadoPlan = (id, data) => api.post(`/apartados-plan/${id}/convertir`, data);
