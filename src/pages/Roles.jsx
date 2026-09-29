import { useEffect, useState } from 'react';
import * as rolesApi from '../api/roles';
import { SECTIONS } from '../config/sections.js';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const emptyForm = { nombre: '', secciones: [], nivel: 'OPERATIVO', permisos: [] };

// Espejo del enum Permiso del backend, agrupado por modulo para la UI.
const PERMISOS_POR_MODULO = [
  { modulo: 'Alumnos', permisos: ['ALUMNOS_VER', 'ALUMNOS_CREAR', 'ALUMNOS_EDITAR', 'ALUMNOS_BAJA'] },
  { modulo: 'Membresias', permisos: ['MEMBRESIAS_VER', 'MEMBRESIAS_CREAR', 'MEMBRESIAS_RENOVAR', 'MEMBRESIAS_SUSPENDER', 'MEMBRESIAS_CANCELAR'] },
  { modulo: 'Pagos', permisos: ['PAGOS_VER', 'PAGOS_REGISTRAR', 'PAGOS_CANCELAR'] },
  { modulo: 'Caja', permisos: ['CAJA_VER', 'CAJA_ABRIR', 'CAJA_MOVIMIENTO', 'CAJA_CERRAR'] },
  { modulo: 'Inventario', permisos: ['INVENTARIO_VER', 'INVENTARIO_CREAR', 'INVENTARIO_EDITAR', 'INVENTARIO_ENTRADA', 'INVENTARIO_AJUSTE_NEGATIVO'] },
  { modulo: 'Ventas', permisos: ['VENTAS_VER', 'VENTAS_CREAR', 'VENTAS_CANCELAR'] },
  { modulo: 'Apartados', permisos: ['APARTADOS_VER', 'APARTADOS_GESTIONAR', 'APARTADOS_CANCELAR'] },
  { modulo: 'Clases', permisos: ['CLASES_VER', 'CLASES_CREAR', 'CLASES_EDITAR', 'CLASES_CANCELAR'] },
  { modulo: 'Asistencias', permisos: ['ASISTENCIAS_VER', 'ASISTENCIAS_REGISTRAR'] },
  { modulo: 'Instructores', permisos: ['INSTRUCTORES_VER', 'INSTRUCTORES_ADMINISTRAR'] },
  { modulo: 'Reportes', permisos: ['REPORTES_OPERATIVOS', 'REPORTES_FINANCIEROS'] },
  { modulo: 'Usuarios', permisos: ['USUARIOS_VER', 'USUARIOS_CREAR', 'USUARIOS_EDITAR'] },
  { modulo: 'Roles', permisos: ['ROLES_VER', 'ROLES_ADMINISTRAR'] },
  { modulo: 'Configuracion', permisos: ['CONFIGURACION_VER', 'CONFIGURACION_EDITAR', 'NOTIFICACIONES_CONFIGURAR'] },
];
const LABEL_PERMISO = {
  ALUMNOS_VER: 'Ver', ALUMNOS_CREAR: 'Crear', ALUMNOS_EDITAR: 'Editar', ALUMNOS_BAJA: 'Dar de baja',
  MEMBRESIAS_VER: 'Ver', MEMBRESIAS_CREAR: 'Crear/asignar', MEMBRESIAS_RENOVAR: 'Renovar',
  MEMBRESIAS_SUSPENDER: 'Suspender', MEMBRESIAS_CANCELAR: 'Cancelar',
  PAGOS_VER: 'Ver', PAGOS_REGISTRAR: 'Registrar', PAGOS_CANCELAR: 'Cancelar',
  CAJA_VER: 'Ver movimientos', CAJA_ABRIR: 'Abrir corte', CAJA_MOVIMIENTO: 'Registrar ingreso/egreso', CAJA_CERRAR: 'Cerrar corte',
  INVENTARIO_VER: 'Ver', INVENTARIO_CREAR: 'Crear articulos', INVENTARIO_EDITAR: 'Editar articulos',
  INVENTARIO_ENTRADA: 'Registrar entradas', INVENTARIO_AJUSTE_NEGATIVO: 'Quitar piezas (ajuste negativo)',
  VENTAS_VER: 'Ver', VENTAS_CREAR: 'Vender', VENTAS_CANCELAR: 'Cancelar venta',
  APARTADOS_VER: 'Ver', APARTADOS_GESTIONAR: 'Confirmar/completar', APARTADOS_CANCELAR: 'Cancelar',
  CLASES_VER: 'Ver', CLASES_CREAR: 'Crear', CLASES_EDITAR: 'Editar', CLASES_CANCELAR: 'Cancelar/desactivar',
  ASISTENCIAS_VER: 'Ver', ASISTENCIAS_REGISTRAR: 'Registrar',
  INSTRUCTORES_VER: 'Ver', INSTRUCTORES_ADMINISTRAR: 'Administrar',
  REPORTES_OPERATIVOS: 'Operativos (asistencia, ocupacion...)', REPORTES_FINANCIEROS: 'Financieros (ingresos, cartera...)',
  USUARIOS_VER: 'Ver', USUARIOS_CREAR: 'Crear', USUARIOS_EDITAR: 'Editar/desactivar',
  ROLES_VER: 'Ver', ROLES_ADMINISTRAR: 'Crear/editar roles',
  CONFIGURACION_VER: 'Ver', CONFIGURACION_EDITAR: 'Editar', NOTIFICACIONES_CONFIGURAR: 'Configurar notificaciones',
};

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    load();
  }, []);

  function load() {
    rolesApi.listRoles().then(({ data }) => setRoles(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setModal({ editing: null });
  }
  function openEdit(r) {
    setForm({ nombre: r.nombre, secciones: r.secciones, nivel: r.nivel === 'SUPERVISOR' || r.nivel === 'SUPER_ADMIN' ? 'ADMIN' : r.nivel, permisos: r.permisos || [] });
    setModal({ editing: r.id, esSistema: r.esSistema });
  }

  function toggleSection(code) {
    setForm((f) => ({ ...f, secciones: f.secciones.includes(code) ? f.secciones.filter((s) => s !== code) : [...f.secciones, code] }));
  }
  function togglePermiso(code) {
    setForm((f) => ({ ...f, permisos: f.permisos.includes(code) ? f.permisos.filter((p) => p !== code) : [...f.permisos, code] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim() || form.secciones.length === 0) {
      notify('Ingresa un nombre y selecciona al menos una seccion', 'error');
      return;
    }
    try {
      if (modal.editing) {
        await rolesApi.updateRol(modal.editing, form);
        notify('Rol actualizado', 'success');
      } else {
        await rolesApi.createRol(form);
        notify('Rol creado', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el rol', 'error');
    }
  }

  async function handleDelete(r) {
    const ok = await confirmDialog(`Eliminar el rol "${r.nombre}"?`, { danger: true });
    if (!ok) return;
    try {
      await rolesApi.deleteRol(r.id);
      notify('Rol eliminado', 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo eliminar', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Roles y permisos</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nuevo rol</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{r.nombre}</h3>
              {r.esSistema && <span className="text-xs text-gray-400">Sistema</span>}
            </div>
            <p className="text-xs text-gray-500">{r.secciones.length} secciones · {r.permisos?.length || 0} permisos</p>
            <p className="text-xs text-gray-400 mb-3">Nivel: {r.nivel}</p>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => openEdit(r)} disabled={r.esSistema}>
                {r.esSistema ? 'Rol de sistema' : 'Editar'}
              </button>
              {!r.esSistema && (
                <button className="btn-danger text-xs" onClick={() => handleDelete(r)}>Eliminar</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar rol' : 'Nuevo rol'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel jerarquico</label>
              <select className="input" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                <option value="OPERATIVO">Operativo (recepcion, caja, instructor...)</option>
                <option value="ADMIN">Admin / Gerente / Encargado</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Decide a quien puede administrar este rol, no que puede operar (eso son los permisos de abajo).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secciones visibles (modulos del menu)</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.filter((s) => s.code !== 'CENTROS').map((s) => (
                  <label key={s.code} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.secciones.includes(s.code)} onChange={() => toggleSection(s.code)} />
                    {s.icon} {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permisos granulares (que puede hacer dentro de cada modulo)</label>
              <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-100 rounded-lg p-3">
                {PERMISOS_POR_MODULO.map((grupo) => (
                  <div key={grupo.modulo}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{grupo.modulo}</p>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {grupo.permisos.map((p) => (
                        <label key={p} className="flex items-center gap-2 text-xs text-gray-700">
                          <input type="checkbox" checked={form.permisos.includes(p)} onChange={() => togglePermiso(p)} />
                          {LABEL_PERMISO[p] || p}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear rol'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
