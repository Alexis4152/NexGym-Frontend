// Catalogo de secciones (RBAC) para el sidebar y el guard de rutas. Debe reflejar
// el enum Seccion del backend (com.nexora.sport.model.Seccion). Usado por Roles.jsx
// para el checklist de permisos por rol -- NO reordenar/agrupar aqui, es un catalogo
// plano de "que puede ver" un rol, independiente de como se organice el menu.
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
  { code: 'NOTIFICACIONES', label: 'Notificaciones', icon: '🔔', path: '/notificaciones' },
  { code: 'USUARIOS', label: 'Usuarios', icon: '👤', path: '/usuarios' },
  { code: 'ROLES', label: 'Roles y permisos', icon: '🔐', path: '/roles' },
  { code: 'CENTROS', label: 'Centros', icon: '🏢', path: '/centros' },
];

// Estructura de NAVEGACION del sidebar -- puramente organizacion visual, agrupa
// pantallas relacionadas bajo un encabezado colapsable. NO otorga permisos: cada
// hijo sigue respetando exactamente el mismo `section` (Seccion backend) que tenia
// como pestaña o como item plano antes de esta reorganizacion (ver auditoria de la
// tarea "reorganizar navegacion"). Si un hijo no tiene `section` usa `requires`
// ('admin' | 'superAdmin') para casos especiales que ya existian (Centros, Config.
// del centro) y que tampoco pasan por Seccion.
export const NAV_GROUPS = [
  { type: 'link', code: 'DASHBOARD', label: 'Panel', icon: '📊', path: '/', section: 'DASHBOARD' },
  {
    type: 'group', code: 'GRUPO_VENTAS', label: 'Ventas y tienda', icon: '🛒',
    children: [
      { code: 'PUNTO_VENTA', label: 'Punto de venta', path: '/punto-venta', section: 'TIENDA' },
      { code: 'VENTAS', label: 'Ventas', path: '/ventas', section: 'TIENDA' },
      { code: 'APARTADOS', label: 'Apartados', path: '/apartados', section: 'TIENDA' },
      { code: 'CATALOGO_PUBLICO', label: 'Catálogo público', path: '/catalogo-publico', section: 'TIENDA' },
    ],
  },
  {
    type: 'group', code: 'GRUPO_MEMBRESIAS', label: 'Membresías y cobranza', icon: '🎫',
    children: [
      { code: 'MEMBRESIAS', label: 'Membresías', path: '/membresias', section: 'MEMBRESIAS' },
      { code: 'PLANES', label: 'Planes', path: '/planes', section: 'MEMBRESIAS' },
    ],
  },
  {
    type: 'group', code: 'GRUPO_DEPORTIVA', label: 'Gestión deportiva', icon: '🏋️',
    children: [
      { code: 'ALUMNOS', label: 'Alumnos', path: '/alumnos', section: 'ALUMNOS' },
      { code: 'CLASES', label: 'Clases y horarios', path: '/clases', section: 'CLASES' },
      { code: 'ASISTENCIA', label: 'Asistencia', path: '/asistencia', section: 'ASISTENCIA' },
      { code: 'INSTRUCTORES', label: 'Instructores', path: '/instructores', section: 'INSTRUCTORES' },
      { code: 'DISCIPLINAS', label: 'Disciplinas', path: '/disciplinas', section: 'DISCIPLINAS' },
      // Instalaciones (Lugar) sigue viviendo bajo Seccion=CLASES en el backend
      // (LugarController @sectionAccess.check('CLASES')) -- solo se separo la
      // navegacion, no se creo un permiso nuevo.
      { code: 'INSTALACIONES', label: 'Instalaciones', path: '/instalaciones', section: 'CLASES' },
      // Cupo de TODAS las sucursales del centro (no solo la del actor) -- para
      // mostrador, ver ClaseService.disponibilidad en el backend.
      { code: 'DISPONIBILIDAD', label: 'Disponibilidad', path: '/disponibilidad', section: 'CLASES' },
    ],
  },
  {
    type: 'group', code: 'GRUPO_INVENTARIO', label: 'Inventario y compras', icon: '📦',
    children: [
      { code: 'INVENTARIO', label: 'Inventario', path: '/inventario', section: 'INVENTARIO' },
      { code: 'COMPRAS', label: 'Compras', path: '/compras', section: 'COMPRAS' },
      { code: 'PROVEEDORES', label: 'Proveedores', path: '/proveedores', section: 'COMPRAS' },
    ],
  },
  {
    type: 'group', code: 'GRUPO_CAJA', label: 'Caja y finanzas', icon: '💰',
    children: [
      { code: 'CAJA', label: 'Caja', path: '/caja', section: 'CAJA' },
      // Cortes de caja sigue viviendo bajo Seccion=TIENDA en el backend
      // (CorteCajaController @sectionAccess.check('TIENDA')): el corte hoy solo
      // cubre ventas de tienda, aunque conceptualmente ya no vive en ese menu.
      { code: 'CORTES_CAJA', label: 'Cortes de caja', path: '/cortes-caja', section: 'TIENDA' },
    ],
  },
  {
    type: 'group', code: 'GRUPO_REPORTES', label: 'Reportes', icon: '📈',
    children: [
      { code: 'REPORTES_RESUMEN', label: 'Resumen general', path: '/reportes', section: 'REPORTES' },
      { code: 'REPORTES_FINANZAS', label: 'Finanzas', path: '/reportes/finanzas', section: 'REPORTES' },
      { code: 'REPORTES_TIENDA', label: 'Tienda', path: '/reportes/tienda', section: 'REPORTES' },
      { code: 'REPORTES_MEMBRESIAS', label: 'Membresías', path: '/reportes/membresias', section: 'REPORTES' },
      { code: 'REPORTES_ALUMNOS', label: 'Alumnos', path: '/reportes/alumnos', section: 'REPORTES' },
      { code: 'REPORTES_OPERACION', label: 'Operación', path: '/reportes/operacion', section: 'REPORTES' },
    ],
  },
  { type: 'link', code: 'NOTIFICACIONES', label: 'Notificaciones', icon: '🔔', path: '/notificaciones', section: 'NOTIFICACIONES' },
  {
    type: 'group', code: 'GRUPO_ADMIN', label: 'Administración', icon: '⚙️',
    children: [
      { code: 'USUARIOS', label: 'Usuarios', path: '/usuarios', section: 'USUARIOS' },
      { code: 'ROLES', label: 'Roles y permisos', path: '/roles', section: 'ROLES' },
      { code: 'CENTRO_INFO', label: 'Configuración del centro', path: '/centro-info', requires: 'admin' },
      // Administrar sucursales (crear/editar/desactivar) es exclusivo del Dueno o
      // SUPER_ADMIN (SucursalService.assertPuedeAdministrarSucursales en el backend) --
      // un Admin/Operativo de sucursal ni siquiera ve esta opcion en el menu, solo
      // opera dentro de la(s) sucursal(es) que tiene asignada(s).
      { code: 'SUCURSALES', label: 'Sucursales', path: '/sucursales', requires: 'admin' },
      { code: 'CENTROS', label: 'Centros', path: '/centros', requires: 'superAdmin' },
      { code: 'CORREO_SISTEMA', label: 'Correo del sistema', path: '/correo-sistema', requires: 'superAdmin' },
    ],
  },
];
