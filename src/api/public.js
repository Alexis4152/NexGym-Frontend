import axios from 'axios';

// Cliente sin interceptores de auth: el catalogo publico nunca envia token.
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export const getPublicCentro = (slug) => publicApi.get(`/public/centros/${slug}`);
export const getPublicProductos = (slug) => publicApi.get(`/public/centros/${slug}/productos`);
export const getPublicApartables = (slug) => publicApi.get(`/public/centros/${slug}/apartables`);
export const crearPublicApartado = (slug, data) => publicApi.post(`/public/centros/${slug}/apartados`, data);
