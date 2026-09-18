import api from './axios';

export const getCorteAbierto = () => api.get('/cortes-caja/abierto');
export const listCortesCaja = (page = 0, size = 20) => api.get('/cortes-caja', { params: { page, size } });
export const getCorteCaja = (id) => api.get(`/cortes-caja/${id}`);
export const getCorteCajaResumen = (id) => api.get(`/cortes-caja/${id}/resumen`);
export const abrirCorteCaja = (data) => api.post('/cortes-caja/abrir', data);
export const cerrarCorteCaja = (id, data) => api.post(`/cortes-caja/${id}/cerrar`, data);
