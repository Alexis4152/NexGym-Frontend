// Catalogo de secciones para el sidebar y el guard de rutas. Debe reflejar
// el enum Seccion del backend (com.nexora.sport.model.Seccion).
export const SECTIONS = [
  { code: 'DASHBOARD', label: 'Panel', icon: '📊', path: '/' },
  { code: 'ALUMNOS', label: 'Alumnos', icon: '🧑‍🤝‍🧑', path: '/alumnos' },
  { code: 'MEMBRESIAS', label: 'Membresias', icon: '🎫', path: '/membresias' },
  { code: 'CLASES', label: 'Clases y horarios', icon: '🗓️', path: '/clases' },
  { code: 'ASISTENCIA', label: 'Asistencia', icon: '✅', path: '/asistencia' },
  { code: 'INSTRUCTORES', label: 'Instructores', icon: '🏋️', path: '/instructores' },
  { code: 'DISCIPLINAS', label: 'Disciplinas', icon: '🥊', path: '/disciplinas' },
  { code: 'INVENTARIO', label: 'Inventario', icon: '📦', path: '/inventario' },
  { code: 'TIENDA', label: 'Tienda', icon: '🛍️', path: '/tienda' },
  { code: 'CAJA', label: 'Caja', icon: '💰', path: '/caja' },
  { code: 'COMPRAS', label: 'Compras y proveedores', icon: '🚚', path: '/compras' },
  { code: 'REPORTES', label: 'Reportes', icon: '📈', path: '/reportes' },
  { code: 'USUARIOS', label: 'Usuarios', icon: '👤', path: '/usuarios' },
  { code: 'ROLES', label: 'Roles y permisos', icon: '🔐', path: '/roles' },
  { code: 'CENTROS', label: 'Centros', icon: '🏢', path: '/centros' },
];
