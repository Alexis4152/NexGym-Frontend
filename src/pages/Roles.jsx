import { useEffect, useState } from 'react';
import * as rolesApi from '../api/roles';
import { SECTIONS } from '../config/sections.js';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const emptyForm = { nombre: '', secciones: [] };

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
    setForm({ nombre: r.nombre, secciones: r.secciones });
    setModal({ editing: r.id, esSistema: r.esSistema });
  }

  function toggleSection(code) {
    setForm((f) => ({ ...f, secciones: f.secciones.includes(code) ? f.secciones.filter((s) => s !== code) : [...f.secciones, code] }));
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
            <p className="text-xs text-gray-500 mb-3">{r.secciones.length} secciones habilitadas</p>
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
        <Modal title={modal.editing ? 'Editar rol' : 'Nuevo rol'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secciones visibles</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.filter((s) => s.code !== 'CENTROS').map((s) => (
                  <label key={s.code} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.secciones.includes(s.code)} onChange={() => toggleSection(s.code)} />
                    {s.icon} {s.label}
                  </label>
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
