import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

const ACTING_CENTRO_HEADER = 'X-Acting-Centro-Id';
const ACTING_SUCURSAL_HEADER = 'X-Acting-Sucursal-Id';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexorasport_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const actingCentroId = localStorage.getItem('nexorasport_acting_centro');
  if (actingCentroId) config.headers[ACTING_CENTRO_HEADER] = actingCentroId;
  const actingSucursalId = localStorage.getItem('nexorasport_acting_sucursal');
  if (actingSucursalId) config.headers[ACTING_SUCURSAL_HEADER] = actingSucursalId;
  return config;
});

let refreshPromise = null;
let loggedOut = false;
let sucursalInvalidada = false;

// Si el backend rechaza la sucursal activa (perdio el acceso porque el dueno se lo
// quito, o la sucursal se desactivo -- TenantScope#sucursalActivaId, seccion 29/30
// del encargo de sucursal activa), el contexto guardado en este navegador quedo
// invalido. Se limpia y se recarga para que PrivateRoute vuelva a decidir: si le
// queda exactamente una sucursal la toma sola, si le quedan varias pide elegir de
// nuevo, y si se quedo sin ninguna muestra el aviso correspondiente.
function esRechazoDeSucursalActiva(response) {
  const msg = response?.data?.message;
  return response?.status === 400 && typeof msg === 'string' &&
    (msg.includes('Selecciona una sucursal para continuar') || msg.includes('No tienes ninguna sucursal asignada'));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    if (esRechazoDeSucursalActiva(response) && !sucursalInvalidada) {
      sucursalInvalidada = true;
      localStorage.removeItem('nexorasport_acting_sucursal');
      window.location.href = '/select-sucursal';
      return Promise.reject(error);
    }

    if (response?.status === 401 && !isAuthEndpoint && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => { refreshPromise = null; });
        }
        const { data } = await refreshPromise;
        localStorage.setItem('nexorasport_token', data.data.accessToken);
        config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        if (!loggedOut) {
          loggedOut = true;
          localStorage.removeItem('nexorasport_token');
          localStorage.removeItem('nexorasport_user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
