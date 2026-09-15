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
      setUser(null);
      setActingCentroId(null);
    }
  }

  function selectCentro(centroId) {
    localStorage.setItem('nexorasport_acting_centro', String(centroId));
    setActingCentroId(String(centroId));
  }

  function clearSelectedCentro() {
    localStorage.removeItem('nexorasport_acting_centro');
    setActingCentroId(null);
  }

  const isSuperAdmin = user?.rolNombre === 'SUPER_ADMIN';
  const isPlatformActor = isSuperAdmin;
  const isAdmin = user?.rolNombre === 'Dueno' || isSuperAdmin;
  const hasSection = (code) => !!user?.secciones?.includes(code);

  const value = {
    user,
    loading,
    login,
    logout,
    setUser: persistUser,
    isAdmin,
    isSuperAdmin,
    isPlatformActor,
    hasSection,
    actingCentroId,
    selectCentro,
    clearSelectedCentro,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
