import api from './axios';

const rango = (from, to, extra = {}) => ({ params: { from, to, ...extra } });

// Tienda
export const tiendaResumen = (from, to) => api.get('/reportes/tienda/resumen', rango(from, to));
export const tiendaResumenComparativo = (from, to) => api.get('/reportes/tienda/resumen-comparativo', rango(from, to));
export const tiendaPorDia = (from, to) => api.get('/reportes/tienda/por-dia', rango(from, to));
export const tiendaPorMes = (from, to) => api.get('/reportes/tienda/por-mes', rango(from, to));
export const tiendaProductos = (from, to, limit = 10) => api.get('/reportes/tienda/productos', rango(from, to, { limit }));
export const tiendaProductosMargen = (from, to, limit = 10) => api.get('/reportes/tienda/productos-margen', rango(from, to, { limit }));
export const tiendaCategorias = (from, to) => api.get('/reportes/tienda/categorias', rango(from, to));

// Finanzas
export const finanzasResumen = (from, to) => api.get('/reportes/finanzas/resumen', rango(from, to));
export const finanzasResumenComparativo = (from, to) => api.get('/reportes/finanzas/resumen-comparativo', rango(from, to));
export const finanzasMetodosPago = (from, to) => api.get('/reportes/finanzas/metodos-pago', rango(from, to));
export const cartera = () => api.get('/reportes/finanzas/cartera');

// Membresias
export const membresiasVentas = (from, to) => api.get('/reportes/membresias/ventas', rango(from, to));
export const membresiasVencimientos = (horizonteDias = 7) => api.get('/reportes/membresias/vencimientos', { params: { horizonteDias } });
export const membresiasRenovaciones = (from, to) => api.get('/reportes/membresias/renovaciones', rango(from, to));

// Alumnos
export const alumnosResumen = (from, to) => api.get('/reportes/alumnos/resumen', rango(from, to));
export const alumnosRetencion = (from, to) => api.get('/reportes/alumnos/retencion', rango(from, to));
export const alumnosRiesgoAbandono = () => api.get('/reportes/alumnos/riesgo-abandono');

// Operacion
export const operacionAsistencias = (from, to) => api.get('/reportes/operacion/asistencias', rango(from, to));
export const operacionOcupacionClases = (from, to, sucursalId) => api.get('/reportes/operacion/ocupacion-clases', rango(from, to, sucursalId ? { sucursalId } : {}));
export const operacionInstructores = (from, to) => api.get('/reportes/operacion/instructores', rango(from, to));
export const operacionDisciplinas = (from, to) => api.get('/reportes/operacion/disciplinas', rango(from, to));
export const operacionUsuarios = (from, to) => api.get('/reportes/operacion/usuarios', rango(from, to));

// PDF
export const descargarPdf = (from, to) => api.get('/reportes/pdf', { ...rango(from, to), responseType: 'blob' });
