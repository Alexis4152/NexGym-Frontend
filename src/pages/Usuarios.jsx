import { useEffect, useState } from 'react';
import * as usuariosApi from '../api/usuarios';
import * as rolesApi from '../api/roles';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const emptyForm = { nombre: '', email: '', rolId: '' };

export default function Usuarios() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    rolesApi.listRoles().then(({ data }) => setRoles(data.data));
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  function load() {
    usuariosApi.listUsuarios(page, 20).then(({ data }) => setPageData(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setModal({ editing: null });
  }
  function openEdit(u) {
    setForm({ nombre: u.nombre, email: u.email, rolId: u.rolId });
    setErrors({});
    setModal({ editing: u.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.rolId) {
      setErrors({ nombre: !form.nombre.trim() ? 'Obligatorio' : undefined, rolId: !form.rolId ? 'Selecciona un rol' : undefined });
      return;
    }
    try {
      if (modal.editing) {
        await usuariosApi.updateUsuario(modal.editing, form);
        notify('Usuario actualizado', 'success');
      } else {
        await usuariosApi.createUsuario(form);
        notify('Usuario creado, se envio su contrasena temporal por correo', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      setErrors(err.response?.data?.data || {});
    }
  }

  async function handleDeactivate(u) {
    const ok = await confirmDialog(`Desactivar a ${u.nombre}?`, { danger: true });
    if (!ok) return;
    await usuariosApi.deactivateUsuario(u.id);
    notify('Usuario desactivado', 'success');
    load();
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((u) => (
              <tr key={u.id} className={'border-b border-gray-50 ' + (!u.activo ? 'opacity-50' : '')}>
                <td className="py-2 font-medium text-gray-800">{u.nombre}</td>
                <td className="text-gray-600">{u.email}</td>
                <td className="text-gray-600">{u.rolNombre}</td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => openEdit(u)}>Editar</button>
                  {u.activo && <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(u)}>Desactivar</button>}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin usuarios</td></tr>}
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
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              {errors.rolId && <p className="text-xs text-red-600 mt-1">{errors.rolId}</p>}
            </div>
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
