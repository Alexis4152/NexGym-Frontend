import { useEffect, useState } from 'react';
import * as instructoresApi from '../api/instructores';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import PhoneInput from '../components/PhoneInput.jsx';

const emptyForm = { nombre: '', telefono: '', email: '', especialidad: '', disciplinaIds: [] };

export default function Instructores() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [disciplinas, setDisciplinas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [disciplinaDocumento, setDisciplinaDocumento] = useState('');
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

  function loadDocumentos(instructorId) {
    instructoresApi.listDocumentosInstructor(instructorId).then(({ data }) => setDocumentos(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setDocumentos([]);
    setDisciplinaDocumento('');
    setModal({ editing: null });
  }

  function openEdit(i) {
    setForm({ nombre: i.nombre, telefono: i.telefono || '', email: i.email || '', especialidad: i.especialidad || '', disciplinaIds: i.disciplinaIds || [] });
    setErrors({});
    setDisciplinaDocumento('');
    loadDocumentos(i.id);
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
    if (form.disciplinaIds.length === 0) {
      setErrors({ disciplinaIds: 'Selecciona al menos una disciplina' });
      return;
    }
    try {
      if (modal.editing) {
        await instructoresApi.updateInstructor(modal.editing, form);
        notify('Instructor actualizado', 'success');
        setModal(null);
      } else {
        const { data } = await instructoresApi.createInstructor(form);
        notify('Instructor creado, ya puedes subir sus diplomas', 'success');
        setModal({ editing: data.data.id });
        setDocumentos([]);
      }
      load();
    } catch (err) {
      setErrors(err.response?.data?.data || {});
    }
  }

  async function handleSubirDocumento(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!disciplinaDocumento) {
      notify('Selecciona a que disciplina corresponde el documento', 'error');
      e.target.value = '';
      return;
    }
    setSubiendoDocumento(true);
    try {
      await instructoresApi.subirDocumentoInstructor(modal.editing, disciplinaDocumento, file);
      loadDocumentos(modal.editing);
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo subir el documento', 'error');
    } finally {
      setSubiendoDocumento(false);
      e.target.value = '';
    }
  }

  async function eliminarDocumento(documentoId) {
    const ok = await confirmDialog('Quitar este documento?', { danger: true });
    if (!ok) return;
    await instructoresApi.eliminarDocumentoInstructor(modal.editing, documentoId);
    loadDocumentos(modal.editing);
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <PhoneInput value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
              <input className="input" maxLength={200} value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
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
              {errors.disciplinaIds && <p className="text-xs text-red-600 mt-1">{errors.disciplinaIds}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diplomas / Titulos</label>
              {modal.editing ? (
                <div className="space-y-2">
                  {documentos.length > 0 && (
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {documentos.map((d) => (
                        <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <a href={d.ruta} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">
                            {d.disciplinaNombre} — {d.nombreOriginal || 'documento'}
                          </a>
                          <button type="button" className="text-red-600 text-xs hover:underline shrink-0 ml-2" onClick={() => eliminarDocumento(d.id)}>
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <select className="input flex-1" value={disciplinaDocumento} onChange={(e) => setDisciplinaDocumento(e.target.value)}>
                      <option value="">Selecciona disciplina...</option>
                      {disciplinas.filter((d) => form.disciplinaIds.includes(d.id)).map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                    <label className="btn-secondary shrink-0 cursor-pointer flex items-center px-3 text-sm">
                      {subiendoDocumento ? '...' : '+ Archivo'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleSubirDocumento} disabled={subiendoDocumento} />
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Guarda el instructor primero; despues podras subir sus diplomas aqui mismo.</p>
              )}
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear instructor'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
