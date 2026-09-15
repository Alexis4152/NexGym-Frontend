import { useEffect, useState } from 'react';
import * as instructoresApi from '../api/instructores';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const emptyForm = { nombre: '', telefono: '', email: '', especialidad: '', disciplinaIds: [] };

export default function Instructores() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [disciplinas, setDisciplinas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  function load() {
    instructoresApi.listInstructores(q, page, 20).then(({ data }) => setPageData(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setModal({ editing: null });
  }

  function openEdit(i) {
    setForm({ nombre: i.nombre, telefono: i.telefono || '', email: i.email || '', especialidad: i.especialidad || '', disciplinaIds: i.disciplinaIds || [] });
    setErrors({});
    setModal({ editing: i.id });
  }

  function toggleDisciplina(id) {
    setForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    try {
      if (modal.editing) {
        await instructoresApi.updateInstructor(modal.editing, form);
        notify('Instructor actualizado', 'success');
      } else {
        await instructoresApi.createInstructor(form);
        notify('Instructor creado', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      setErrors(err.response?.data?.data || {});
    }
  }

  async function handleDeactivate(i) {
    const ok = await confirmDialog(`Desactivar a ${i.nombre}?`, { danger: true });
    if (!ok) return;
    await instructoresApi.deactivateInstructor(i.id);
    notify('Instructor desactivado', 'success');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Instructores</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Nuevo instructor
        </button>
      </div>

      <input className="input max-w-xs mb-4" placeholder="Buscar por nombre..." value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Nombre</th>
              <th>Disciplinas</th>
              <th>Contacto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((i) => (
              <tr key={i.id} className={'border-b border-gray-50 ' + (!i.activo ? 'opacity-50' : '')}>
                <td className="py-2 font-medium text-gray-800">{i.nombre}</td>
                <td className="text-gray-600">{i.disciplinaNombres?.join(', ') || '-'}</td>
                <td className="text-gray-600">{i.telefono || i.email || '-'}</td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => openEdit(i)}>
                    Editar
                  </button>
                  {i.activo && (
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(i)}>
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar instructor' : 'Nuevo instructor'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
              <input className="input" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas que imparte</label>
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDisciplina(d.id)}
                    className={
                      'px-3 py-1 rounded-full text-xs border ' +
                      (form.disciplinaIds.includes(d.id)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-300')
                    }
                  >
                    {d.icono} {d.nombre}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear instructor'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
