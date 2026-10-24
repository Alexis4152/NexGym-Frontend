import axios from 'axios';

// Cliente sin interceptores de auth: el catalogo publico nunca envia token.
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export const getPublicCentro = (slug) => publicApi.get(`/public/centros/${slug}`);
export const getPublicApartables = (slug) => publicApi.get(`/public/centros/${slug}/apartables`);
export const getPublicPlanes = (slug) => publicApi.get(`/public/centros/${slug}/planes`);
export const crearPublicApartado = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados`, data);
export const crearPublicApartadoPlan = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados-plan`, data);

// Seguimiento de un apartado de productos sin cuenta (homologado con DemoPV). Van por POST
// para no dejar el telefono en la URL.
// { folio, telefono } -> estado del apartado (el telefono debe coincidir con el del apartado)
export const consultarPublicApartado = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados/consulta`, data);
// { telefono } -> hasta 10 apartados recientes del centro con ese telefono ("¿No tienes tu folio?")
export const buscarPublicApartadosPorTelefono = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados/consulta-telefono`, data);
// { folio, telefono, motivo? } -> el cliente cancela su propio apartado (PENDIENTE o ACTIVO)
export const cancelarPublicApartado = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados/cancelar`, data);
