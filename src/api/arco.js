import axios from 'axios';
import api from './axios';

// Solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición, Revocación,
// Limitación). Son de la plataforma, no de un centro: el formulario público y el
// seguimiento por link no llevan sesión, "Mis solicitudes" es de cualquier usuario y la
// atención es solo del SUPER_ADMIN. Igual que DemoPV.

// Sin sesión: cliente aparte, sin el interceptor que manda a /login en un 401 (igual que api/public.js).
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export const crearSolicitudArcoPublica = (data) => publicApi.post('/public/arco', data);
/** Abrir el link confirma el correo (si hacía falta) y regresa el estado actual. */
export const seguimientoArco = (token) => publicApi.get(`/public/arco/seguimiento/${token}`);
export const responderInfoArcoPorToken = (token, respuesta) =>
  publicApi.post(`/public/arco/seguimiento/${token}/responder-info`, { respuesta });

// Cuenta propia
export const listMisSolicitudesArco = () => api.get('/arco/mis-solicitudes');
export const crearMiSolicitudArco = (data) => api.post('/arco/mis-solicitudes', data);
export const responderMiInfoArco = (id, respuesta) => api.post(`/arco/mis-solicitudes/${id}/responder-info`, { respuesta });

// Administración (SUPER_ADMIN)
export const listSolicitudesArco = (estado) => api.get('/admin/arco', { params: { estado: estado || undefined } });
export const contarSolicitudesArcoAbiertas = () => api.get('/admin/arco/abiertas');
export const registrarArcoEnMostrador = (data) => api.post('/admin/arco/mostrador', data);
export const verificarIdentidadArco = (id, data) => api.post(`/admin/arco/${id}/verificar-identidad`, data);
export const pedirInfoArco = (id, data) => api.post(`/admin/arco/${id}/pedir-info`, data);
export const extenderArco = (id, data) => api.post(`/admin/arco/${id}/extender`, data);
export const responderArco = (id, data) => api.post(`/admin/arco/${id}/responder`, data);
export const ejecutarArco = (id, data) => api.post(`/admin/arco/${id}/ejecutar`, data);

/** Descarga la constancia con el token de sesión y la abre en otra pestaña. */
export function abrirConstanciaArco(id) {
  return api.get(`/admin/arco/${id}/constancia.pdf`, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener');
  });
}
