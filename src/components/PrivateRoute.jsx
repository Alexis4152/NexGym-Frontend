import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PrivateRoute({ children, section, adminOnly, superAdminOnly }) {
  const { user, loading, hasSection, isAdmin, isSuperAdmin, isPlatformActor, actingCentroId } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isPlatformActor && !user.centroId && !actingCentroId) return <Navigate to="/select-centro" replace />;

  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (section && !hasSection(section) && !isSuperAdmin) return <Navigate to="/" replace />;

  return children;
}
