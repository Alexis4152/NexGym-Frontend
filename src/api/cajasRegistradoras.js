import api from './axios';

// Cajas registradoras (cajones fisicos) por sucursal, con su estado: en uso o cerrada con su entrega pendiente.
export const listCajasRegistradoras = () => api.get('/cajas-registradoras');
export const createCajaRegistradora = (data) => api.post('/cajas-registradoras', data);
export const updateCajaRegistradora = (id, data) => api.put(`/cajas-registradoras/${id}`, data);
// Retirar (RETIRO) o agregar (FONDO) efectivo con la caja cerrada -- solo administradores
export const movimientoCajaCerrada = (id, data) => api.post(`/cajas-registradoras/${id}/movimientos`, data);
export const listPersonasCaja = () => api.get('/cajas-registradoras/personas');
