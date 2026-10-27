import { useEffect, useState } from 'react';
import * as usuariosApi from '../api/usuarios';
import * as rolesApi from '../api/roles';
import * as sucursalesApi from '../api/sucursales';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { confirmarGuardado } from '../utils/confirmaciones.js';

const emptyForm = { nombre: '', email: '', rolId: '', sucursalId: '', sucursalesAdicionalesIds: [] };

// Espejo del orden real de NivelJerarquia en el backend (el enum declara SUPER_ADMIN,
// SUPERVISOR, ADMIN, OPERATIVO en ese orden — su ordinal ES la jerarquia, una sola
// fuente de verdad). Esto es solo UX: el backend es quien de verdad lo valida.
const NIVEL_ORDEN = { SUPER_ADMIN: 0, SUPERVISOR: 1, ADMIN: 2, OPERATIVO: 3 };
const rangoDe = (nivel) => NIVEL_ORDEN[nivel] ?? 3;

export default function Usuarios() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const { notify, confirmDialog } = useNotify();
  const { user, isSuperAdmin, actingSucursalId } = useAuth();

  const rangoActor = isSuperAdmin ? -1 : rangoDe(user?.nivel);
  // El rol global SUPER_ADMIN (centro nulo) nunca es asignable desde aqui, aunque el
  // backend ya lo filtre — ademas se excluye cualquier rol de rango igual/superior al actor.
  const rolesAsignables = roles.filter((r) => r.centroId != null && rangoDe(r.nivel) > rangoActor);

  const rolSeleccionado = roles.find((r) => String(r.id) === String(form.rolId));
  const requiereSucursal = rolSeleccionado && (rolSeleccionado.nivel === 'ADMIN' || rolSeleccionado.nivel === 'OPERATIVO');

  useEffect(() => {
    rolesApi.listRoles().then(({ data }) => setRoles(data.data));
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  function load() {
    usuariosApi.listUsuarios(page, 20).then(({ data }) => setPageData(data.data));
  }

  function openCreate() {
    // La sucursal ACTIVA del creador se preselecciona (seccion 16 del encargo de
    // sucursal activa): si administra varias, lo mas probable es que el nuevo
    // usuario sea para la sucursal en la que esta trabajando ahora mismo. Puede
    // cambiarla por cualquier otra de las suyas antes de guardar.
    const preseleccion = sucursales.some((s) => String(s.id) === String(actingSucursalId)) ? actingSucursalId : '';
    setForm({ ...emptyForm, sucursalId: preseleccion });
    setErrors({});
    setModal({ editing: null });
  }
  function openEdit(u) {
    setForm({
      nombre: u.nombre, email: u.email, rolId: u.rolId, sucursalId: u.sucursalId || '',
      sucursalesAdicionalesIds: u.sucursalesAdicionalesIds ? [...u.sucursalesAdicionalesIds] : [],
    });
    setErrors({});
    setModal({ editing: u.id });
  }

  function toggleSucursalAdicional(id) {
    setForm((f) => ({
      ...f,
      sucursalesAdicionalesIds: f.sucursalesAdicionalesIds.includes(id)
        ? f.sucursalesAdicionalesIds.filter((x) => x !== id)
        : [...f.sucursalesAdicionalesIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.rolId || (requiereSucursal && sucursales.length > 1 && !form.sucursalId)) {
      setErrors({
        nombre: !form.nombre.trim() ? 'Obligatorio' : undefined,
        rolId: !form.rolId ? 'Selecciona un rol' : undefined,
        sucursalId: requiereSucursal && sucursales.length > 1 && !form.sucursalId ? 'Selecciona la sucursal de este usuario' : undefined,
      });
      return;
    }
    // Con una sola sucursal disponible no se muestra el selector: se asigna esa
    // directamente, sin condicionarlo a requiereSucursal (un Dueno/SUPER_ADMIN tambien
    // puede tener acceso a una sola sucursal y el backend igual la exige para ADMIN/OPERATIVO).
    const sucursalUnica = sucursales.length === 1 ? sucursales[0].id : null;
    const payload = {
      ...form,
      sucursalId: form.sucursalId || sucursalUnica || null,
      sucursalesAdicionalesIds: requiereSucursal ? form.sucursalesAdicionalesIds : [],
    };
    if (!(await confirmarGuardado(confirmDialog, {
      editando: !!modal.editing, que: 'al usuario', nombre: modal.editing ? form.nombre : `${form.nombre} (${form.email})`,
    }))) return;
    try {
      if (modal.editing) {
        await usuariosApi.updateUsuario(modal.editing, payload);
        notify('Usuario actualizado', 'success');
      } else {
        await usuariosApi.createUsuario(payload);
        notify('Usuario creado, se envio su contrasena temporal por correo', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      const data = err.response?.data?.data;
      if (data && typeof data === 'object') {
        setErrors(data);
      } else {
        notify(err.response?.data?.message || 'No se pudo guardar el usuario', 'error');
      }
    }
  }

  async function handleDeactivate(u) {
    const ok = await confirmDialog(`Desactivar a ${u.nombre}?`, { danger: true });
    if (!ok) return;
    try {
      await usuariosApi.deactivateUsuario(u.id);
      notify('Usuario desactivado', 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo desactivar', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Usuarios</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nuevo usuario</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              {sucursales.length > 1 && <th>Sucursal</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((u) => {
              const esPropiaCuenta = u.id === user?.id;
              // Espejo exacto de UsuarioService.assertPuedeGestionar en el backend: nadie
              // (salvo SUPER_ADMIN) puede editar/desactivar su propia cuenta ni la de un
              // usuario de su mismo nivel o superior. Antes esto solo se veia como un
              // error al guardar; ahora se refleja directo en la lista.
              const esMismoNivelOSuperior = rangoDe(u.nivel) <= rangoActor;
              const puedeGestionarla = isSuperAdmin || (!esPropiaCuenta && !esMismoNivelOSuperior);
              return (
                <tr key={u.id} className={'border-b border-gray-50 ' + (!u.activo ? 'opacity-50' : '')}>
                  <td className="py-2 font-medium text-gray-800">
                    {u.nombre}
                    {esPropiaCuenta && <span className="text-xs text-gray-400 ml-1">(tu cuenta)</span>}
                  </td>
                  <td className="text-gray-600">{u.email}</td>
                  <td className="text-gray-600">{u.rolNombre}</td>
                  {sucursales.length > 1 && (
                    <td className="text-gray-500">
                      {u.sucursalNombre || 'Todas'}
                      {u.sucursalesAdicionalesNombres?.length > 0 && ` (+${u.sucursalesAdicionalesNombres.length})`}
                    </td>
                  )}
                  <td className="text-right space-x-2">
                    {puedeGestionarla ? (
                      <>
                        <button className="text-brand-600 hover:underline" onClick={() => openEdit(u)}>Editar</button>
                        {u.activo && <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(u)}>Desactivar</button>}
                      </>
                    ) : (
                      <span
                        className="text-xs text-gray-400"
                        title={esPropiaCuenta
                          ? 'Solo un SUPER_ADMIN puede editar tu cuenta'
                          : 'No puedes administrar un usuario de tu mismo nivel o superior'}
                      >
                        Solo lectura
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pageData.content.length === 0 && <tr><td colSpan={sucursales.length > 1 ? 5 : 4} className="py-6 text-center text-gray-400">Sin usuarios</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!modal.editing} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input" value={form.rolId} onChange={(e) => setForm({ ...form, rolId: e.target.value })}>
                <option value="">Selecciona...</option>
                {rolesAsignables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Solo puedes asignar roles de rango inferior al tuyo.</p>
              {errors.rolId && <p className="text-xs text-red-600 mt-1">{errors.rolId}</p>}
            </div>
            {sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sucursal (alcance){requiereSucursal && <span className="text-red-600"> *</span>}
                </label>
                <select className="input" value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}>
                  <option value="">{requiereSucursal ? 'Selecciona una sucursal...' : 'Todas las sucursales'}</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {requiereSucursal
                    ? 'Este rol opera en una sola sucursal: solo vera alumnos/clases de la que elijas aqui.'
                    : 'Si eliges una, este usuario solo vera alumnos/clases de esa sucursal.'}
                </p>
                {errors.sucursalId && <p className="text-xs text-red-600 mt-1">{errors.sucursalId}</p>}
              </div>
            )}
            {requiereSucursal && sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sucursales adicionales (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {sucursales.filter((s) => String(s.id) !== String(form.sucursalId)).map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSucursalAdicional(s.id)}
                      className={
                        'px-3 py-1 rounded-full text-xs border ' +
                        (form.sucursalesAdicionalesIds.includes(s.id)
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-300')
                      }
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Si este usuario es gerente de varias sucursales (ademas de la de arriba), selecciona aqui las demas.
                </p>
              </div>
            )}
            {!modal.editing && (
              <p className="text-xs text-gray-400">Se generara una contrasena temporal y se enviara por correo.</p>
            )}
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear usuario'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
