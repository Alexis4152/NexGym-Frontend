import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { applyBrandColor } from '../utils/theme';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('nexorasport_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [actingCentroId, setActingCentroId] = useState(() => localStorage.getItem('nexorasport_acting_centro'));
  // Sucursal ACTIVA (distinta de "sucursales autorizadas", que ya viene en user.*):
  // en que sucursal esta trabajando AHORA, igual que actingCentroId pero un nivel abajo.
  const [actingSucursalId, setActingSucursalId] = useState(() => localStorage.getItem('nexorasport_acting_sucursal'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexorasport_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ data }) => persistUser(data.data))
      .catch(() => {
        localStorage.removeItem('nexorasport_token');
        localStorage.removeItem('nexorasport_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistUser(u) {
    localStorage.setItem('nexorasport_user', JSON.stringify(u));
    setUser(u);
    if (u?.centroId) applyBrandColor(u.colorPrimario);
  }

  async function login(email, password) {
    // Un login FRESCO siempre debe pasar por el selector de centro si aplica (SUPER_ADMIN
    // o Supervisor multi-centro) — nunca reanuda silenciosamente el centro de una sesion
    // anterior en este navegador, para evitar aterrizar sin darse cuenta en el panel de
    // otro centro. Un refresh de pagina en medio de una sesion activa SI conserva el
    // centro elegido (eso pasa por el efecto de arriba via /auth/me, no por login()).
    localStorage.removeItem('nexorasport_acting_centro');
    localStorage.removeItem('nexorasport_acting_sucursal');
    setActingCentroId(null);
    setActingSucursalId(null);
    const { data } = await authApi.login(email, password);
    localStorage.setItem('nexorasport_token', data.data.accessToken);
    persistUser(data.data.usuario);
    return data.data.usuario;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('nexorasport_token');
      localStorage.removeItem('nexorasport_user');
      localStorage.removeItem('nexorasport_acting_centro');
      localStorage.removeItem('nexorasport_acting_sucursal');
      setUser(null);
      setActingCentroId(null);
      setActingSucursalId(null);
    }
  }

  function selectCentro(centroId) {
    localStorage.setItem('nexorasport_acting_centro', String(centroId));
    setActingCentroId(String(centroId));
    // Cambiar de centro invalida cualquier sucursal activa del centro anterior.
    clearSelectedSucursal();
  }

  function clearSelectedCentro() {
    localStorage.removeItem('nexorasport_acting_centro');
    setActingCentroId(null);
  }

  function selectSucursal(sucursalId) {
    localStorage.setItem('nexorasport_acting_sucursal', String(sucursalId));
    setActingSucursalId(String(sucursalId));
  }

  function clearSelectedSucursal() {
    localStorage.removeItem('nexorasport_acting_sucursal');
    setActingSucursalId(null);
  }

  const isSuperAdmin = user?.nivel === 'SUPER_ADMIN';
  const isSupervisor = user?.nivel === 'SUPERVISOR';
  // Solo entra al selector de centro un SUPER_ADMIN o un Supervisor a quien
  // realmente se le asignaron centros adicionales (seccion 4-5 del encargo) — un
  // dueno de un solo centro nunca ve este selector, entra directo a su centro.
  const isPlatformActor = isSuperAdmin || (isSupervisor && !!user?.tieneVariosCentros);
  const isAdmin = isSupervisor || isSuperAdmin;
  const hasSection = (code) => !!user?.secciones?.includes(code);
  const hasPermiso = (code) => !!user?.permisos?.includes(code);
  // Un ADMIN/OPERATIVO con EXACTAMENTE una sucursal autorizada la usa automaticamente
  // (nada que elegir); con 0 o con 2+ debe pasar por /select-sucursal -- 0 muestra el
  // estado bloqueado "no tienes sucursal asignada" (seccion 31 del encargo), 2+ muestra
  // el selector. Dueno/SUPER_ADMIN nunca se les obliga: operan en "Todas" por defecto.
  const totalSucursalesAsignadas = (user?.sucursalId ? 1 : 0) + (user?.sucursalesAdicionalesIds?.length || 0);
  const necesitaSeleccionarSucursal = !isAdmin && totalSucursalesAsignadas !== 1 && !actingSucursalId;

  const value = {
    user,
    loading,
    login,
    logout,
    setUser: persistUser,
    isAdmin,
    isSuperAdmin,
    isSupervisor,
    isPlatformActor,
    hasSection,
    hasPermiso,
    actingCentroId,
    selectCentro,
    clearSelectedCentro,
    actingSucursalId,
    selectSucursal,
    clearSelectedSucursal,
    necesitaSeleccionarSucursal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
