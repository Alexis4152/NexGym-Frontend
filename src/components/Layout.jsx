import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SECTIONS } from '../config/sections.js';

export default function Layout() {
  const { user, hasSection, isAdmin, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const visibleSections = SECTIONS.filter((s) => {
    if (s.code === 'CENTROS') return isSuperAdmin;
    return hasSection(s.code);
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="font-bold text-brand-700 text-lg leading-tight">NexoraSport</p>
          <p className="text-xs text-gray-500 truncate">{user?.centroNombre || 'Plataforma'}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleSections.map((s) => (
            <NavLink
              key={s.code}
              to={s.path}
              end={s.path === '/'}
              className={({ isActive }) =>
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium ' +
                (isActive ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-600' : 'text-gray-600 hover:bg-gray-50')
              }
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/centro-info"
              className={({ isActive }) =>
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium ' +
                (isActive ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-600' : 'text-gray-600 hover:bg-gray-50')
              }
            >
              <span>⚙️</span>
              <span>Configuracion del centro</span>
            </NavLink>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-800 truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-500 truncate mb-3">{user?.rolNombre}</p>
          <button className="btn-secondary w-full text-sm" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
