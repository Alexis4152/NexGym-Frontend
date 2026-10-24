import api from './axios';

export const buscarCodigoPostal = (cp) => api.get(`/codigos-postales/${cp}`);
