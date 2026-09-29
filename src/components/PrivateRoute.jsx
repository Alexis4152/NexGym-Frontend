import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PrivateRoute({ children, section, adminOnly, superAdminOnly }) {
  const { user, loading, hasSection, isAdmin, isSuperAdmin, isPlatformActor, actingCentroId, necesitaSeleccionarSucursal } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) {
    // Evita el loop de redireccion: si ya estamos en /change-password, deja renderizarla.
    return pathname === '/change-password' ? children : <Navigate to="/change-password" replace />;
  }
  if (isPlatformActor && !user.centroId && !actingCentroId) {
    return pathname === '/select-centro' ? children : <Navigate to="/select-centro" replace />;
  }
  // Un ADMIN/OPERATIVO con varias sucursales autorizadas debe elegir la ACTIVA antes
  // de entrar a cualquier otra pantalla (seccion 5/28 del encargo de sucursal activa).
  if (necesitaSeleccionarSucursal) {
    return pathname === '/select-sucursal' ? children : <Navigate to="/select-sucursal" replace />;
  }

  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (section && !hasSection(section) && !isSuperAdmin) return <Navigate to="/" replace />;

  return children;
}
