import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

const ACTING_CENTRO_HEADER = 'X-Acting-Centro-Id';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexorasport_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const actingCentroId = localStorage.getItem('nexorasport_acting_centro');
  if (actingCentroId) config.headers[ACTING_CENTRO_HEADER] = actingCentroId;
  return config;
});

let refreshPromise = null;
let loggedOut = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

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
