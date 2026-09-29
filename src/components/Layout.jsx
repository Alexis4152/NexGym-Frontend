import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NAV_GROUPS } from '../config/sections.js';
import { useEscapeClose } from '../hooks/useEscapeClose.js';
import NotificationBell from './NotificationBell.jsx';

// Sidebar homologado con DemoPV: mismo esquema oscuro (--brand-sidebar), mismo
// patron de grupos colapsables con chevron (como el submenu "Configuracion" de
// DemoPV, generalizado aqui a varios grupos), y el mismo comportamiento de
// sidebar fijo colapsable a solo-iconos + drawer off-canvas en movil/tablet que
// usa DemoPV (components/Layout.jsx alla). Los grupos son SOLO organizacion
// visual: cada hijo sigue filtrandose por su propio `section`/`requires`.
//
// El menu se comporta como acordeon de un solo nivel: como mucho un grupo
// permanece abierto a la vez (abrir uno cierra el que estuviera abierto antes,
// ya sea por click manual o por navegar a una ruta de otro grupo), y el estado
// NO se persiste entre recargas -- cada vez que se entra o se recarga la
// pagina, todos los grupos inician cerrados salvo el que contiene la ruta
// activa en ese momento (si la hay).
const COLLAPSED_KEY = 'nexorasport_sidebar_collapsed';

// Un hijo esta "activo" si la ruta coincide exacto o es una sub-ruta suya
// (p. ej. /alumnos/42 debe activar el link "Alumnos", cuyo path es /alumnos).
function pathActivo(childPath, pathname) {
  return pathname === childPath || pathname.startsWith(childPath + '/');
}

function grupoDeRuta(pathname) {
  return NAV_GROUPS.find((g) => g.type === 'group' && g.children.some((c) => pathActivo(c.path, pathname)));
}

export default function Layout() {
  const { user, hasSection, isAdmin, isSuperAdmin, isPlatformActor, logout } = useAuth();
  // Sucursal ACTIVA: un Admin/Operativo con mas de una sucursal autorizada puede
  // cambiar sin cerrar sesion (seccion 17 del encargo); Dueno/SUPER_ADMIN tambien
  // puede fijar una concreta (p. ej. para abrir Caja), aunque no se les obligue.
  const totalSucursalesAsignadas = (user?.sucursalId ? 1 : 0) + (user?.sucursalesAdicionalesIds?.length || 0);
  const mostrarCambiarSucursal = isAdmin || totalSucursalesAsignadas > 1;
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  // Sin localStorage a proposito: arranca siempre cerrado, el efecto de abajo lo
  // ajusta a la ruta activa en cuanto se monta (entrar o recargar = limpio).
  const [openGroup, setOpenGroup] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  useEscapeClose(() => setMobileOpen(false));

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  function isChildVisible(child) {
    if (child.requires === 'admin') return isAdmin;
    if (child.requires === 'superAdmin') return isSuperAdmin;
    if (child.section) return hasSection(child.section);
    return true;
  }

  // Click manual en el encabezado de un grupo: si ya estaba abierto lo cierra,
  // si no, lo abre y cierra cualquier otro grupo que estuviera abierto.
  function toggleGroup(code) {
    setOpenGroup((actual) => (actual === code ? null : code));
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }

  // Cada vez que cambia la ruta (incluido el montaje inicial -- entrar o
  // recargar la pagina): si la nueva ruta pertenece a un grupo, ese es el UNICO
  // que queda abierto; si no pertenece a ninguno (p. ej. Panel, Notificaciones),
  // se cierran todos.
  useEffect(() => {
    setOpenGroup(grupoDeRuta(location.pathname)?.code ?? null);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Cuerpo del sidebar, compartido entre el <aside> fijo de escritorio (respeta
  // `collapsed`) y el drawer off-canvas de movil (siempre expandido). `onNavigate`
  // se dispara al hacer click en un link -- en el drawer cierra el overlay.
  function renderSidebarBody(isCollapsed, onNavigate) {
    return (
      <>
        <div className="p-5 border-b border-[var(--brand-sidebar-border)] flex items-start justify-between gap-2 overflow-hidden">
          {isCollapsed ? (
            <div className="w-9 h-9 rounded-full mx-auto bg-brand-600/30 text-brand-200 flex items-center justify-center font-bold text-sm shrink-0">
              {(user?.centroNombre || 'NS').slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="min-w-0">
              <p className="font-bold text-white text-lg leading-tight whitespace-nowrap">NexoraSport</p>
              <p className="text-xs text-slate-400 truncate">{user?.centroNombre || 'Plataforma'}</p>
            </div>
          )}
          {!isCollapsed && (hasSection('NOTIFICACIONES') || isSuperAdmin) && <NotificationBell />}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1">
          {NAV_GROUPS.map((item) => {
            if (item.type === 'link') {
              if (!hasSection(item.section)) return null;
              return (
                <NavLink
                  key={item.code} to={item.path} end={item.path === '/'} title={isCollapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                    (isCollapsed ? 'justify-center' : '') + ' ' +
                    (isActive ? 'bg-brand-600/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')
                  }
                >
                  <span>{item.icon}</span>
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              );
            }

            const hijosVisibles = item.children.filter(isChildVisible);
            if (hijosVisibles.length === 0) return null;
            const contieneActivo = hijosVisibles.some((c) => pathActivo(c.path, location.pathname));

            // Sin espacio para agrupar en modo icono: se muestran sueltos, igual que en DemoPV.
            if (isCollapsed) {
              return hijosVisibles.map((c) => (
                <NavLink
                  key={c.code} to={c.path} title={c.label} onClick={onNavigate}
                  className={({ isActive }) =>
                    'flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                    (isActive ? 'bg-brand-600/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')
                  }
                >
                  <span>{item.icon}</span>
                </NavLink>
              ));
            }

            const abierto = openGroup === item.code;
            return (
              <div key={item.code}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.code)}
                  className={
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                    (contieneActivo ? 'text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')
                  }
                >
                  <span>{item.icon}</span>
                  <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                  <span className={'text-xs transition-transform ' + (abierto ? 'rotate-90' : '')}>›</span>
                </button>
                {abierto && (
                  <div className="mt-1 ml-4 pl-3 border-l border-[var(--brand-sidebar-border)] space-y-1">
                    {hijosVisibles.map((c) => (
                      <NavLink
                        key={c.code} to={c.path} onClick={onNavigate}
                        className={({ isActive }) =>
                          'block px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ' +
                          (isActive ? 'bg-brand-600/20 text-brand-200 font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-white')
                        }
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isPlatformActor && (
            <NavLink
              to="/select-centro" title={isCollapsed ? 'Cambiar centro' : undefined} onClick={onNavigate}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                (isCollapsed ? 'justify-center' : '') + ' ' +
                (isActive ? 'bg-brand-600/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')
              }
            >
              <span>🔀</span>
              {!isCollapsed && <span className="whitespace-nowrap">Cambiar centro</span>}
            </NavLink>
          )}
          {mostrarCambiarSucursal && (
            <NavLink
              to="/select-sucursal" title={isCollapsed ? 'Cambiar sucursal' : undefined} onClick={onNavigate}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                (isCollapsed ? 'justify-center' : '') + ' ' +
                (isActive ? 'bg-brand-600/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')
              }
            >
              <span>🏢</span>
              {!isCollapsed && <span className="whitespace-nowrap">Cambiar sucursal</span>}
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-[var(--brand-sidebar-border)]">
          {!isCollapsed && (
            <>
              <p className="text-sm font-medium text-white truncate">{user?.nombre}</p>
              <p className="mb-3">
                <span className="inline-block bg-brand-600/20 text-brand-200 rounded px-2 py-0.5 text-xs font-medium">
                  {user?.rolNombre}
                </span>
              </p>
            </>
          )}
          <button
            className={
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors ' +
              (isCollapsed ? 'justify-center' : 'justify-center')
            }
            title={isCollapsed ? 'Cerrar sesion' : undefined}
            onClick={handleLogout}
          >
            <span>🚪</span> {!isCollapsed && 'Cerrar sesion'}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar fijo -- solo visible desde `lg:` en adelante */}
      <aside className={'hidden lg:flex ' + (collapsed ? 'w-20' : 'w-64') + ' shrink-0 bg-[var(--brand-sidebar)] border-r border-[var(--brand-sidebar-border)] flex-col transition-all duration-200 relative'}>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Contraer menu'}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-xs text-gray-500 hover:text-brand-700 hover:border-brand-300 z-10"
        >
          {collapsed ? '›' : '‹'}
        </button>
        {renderSidebarBody(collapsed, undefined)}
      </aside>

      {/* Drawer off-canvas -- solo antes de `lg:` */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-[var(--brand-sidebar)] flex flex-col h-full">
            {renderSidebarBody(false, () => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-gray-600" aria-label="Abrir menu">☰</button>
          <span className="font-semibold text-gray-800 truncate">{user?.centroNombre || 'NexoraSport'}</span>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
