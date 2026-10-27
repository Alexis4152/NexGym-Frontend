import { useEffect, useState } from 'react';
import * as instructoresApi from '../api/instructores';
import * as disciplinasApi from '../api/disciplinas';
import * as sucursalesApi from '../api/sucursales';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import PhoneInput from '../components/PhoneInput.jsx';
import { confirmarAccion, confirmarGuardado } from '../utils/confirmaciones.js';

// `email` = correo de ACCESO (su usuario de login); `emailPersonal` = contacto, opcional.
const emptyForm = { nombre: '', telefono: '', email: '', emailPersonal: '', especialidad: '', disciplinaIds: [], sucursalIds: [], fotoUrl: null, usuarioId: null };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mismas reglas que DocumentoInstructorService en el backend.
const TIPOS_DOCUMENTO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DOCUMENTO_BYTES = 5 * 1024 * 1024;

export default function Instructores() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [disciplinas, setDisciplinas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
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
    setModal({ editing: null });
  }

  function openEdit(i) {
    setForm({
      nombre: i.nombre, telefono: i.telefono || '', email: i.email || '', emailPersonal: i.emailPersonal || '',
      especialidad: i.especialidad || '',
      disciplinaIds: i.disciplinaIds || [], sucursalIds: i.sucursalIds || [], fotoUrl: i.fotoUrl || null,
      usuarioId: i.usuarioId || null,
    });
    setErrors({});
    loadDocumentos(i.id);
    setModal({ editing: i.id });
  }

  async function handleSubirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await confirmarAccion(confirmDialog, `¿Cambiar la foto de "${form.nombre}" por "${file.name}"?`))) {
      e.target.value = '';
      return;
    }
    setSubiendoFoto(true);
    try {
      const { data } = await instructoresApi.subirFotoInstructor(modal.editing, file);
      setForm((f) => ({ ...f, fotoUrl: data.data.fotoUrl }));
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo subir la foto', 'error');
    } finally {
      setSubiendoFoto(false);
      e.target.value = '';
    }
  }

  function toggleDisciplina(id) {
    setForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  function toggleSucursal(id) {
    setForm((f) => ({
      ...f,
      sucursalIds: f.sucursalIds.includes(id) ? f.sucursalIds.filter((x) => x !== id) : [...f.sucursalIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setErrors({ email: 'Captura el correo de acceso: será su usuario para iniciar sesión' });
      return;
    }
    if (form.emailPersonal.trim() && !EMAIL_RE.test(form.emailPersonal.trim())) {
      setErrors({ emailPersonal: 'Captura un correo válido' });
      return;
    }
    if (form.disciplinaIds.length === 0) {
      setErrors({ disciplinaIds: 'Selecciona al menos una disciplina' });
      return;
    }
    if (!form.usuarioId) {
      const ok = await confirmDialog(
        `Se creará el acceso al sistema de ${form.nombre.trim()} con el usuario ${form.email.trim().toLowerCase()}. ` +
        'Le llegará a ese correo una contraseña temporal. ¿Continuar?',
        { title: modal.editing ? 'Confirmar cambios' : 'Confirmar registro', confirmLabel: 'Sí, continuar' });
      if (!ok) return;
    } else if (!(await confirmarGuardado(confirmDialog, { editando: true, que: 'al instructor', nombre: form.nombre }))) {
      return;
    }
    const payload = { ...form, email: form.email.trim(), emailPersonal: form.emailPersonal.trim() || null };
    try {
      if (modal.editing) {
        const { data } = await instructoresApi.updateInstructor(modal.editing, payload);
        notify(form.usuarioId ? 'Instructor actualizado' : `Instructor actualizado. Su usuario de acceso es ${data.data.email}`, 'success');
        setModal(null);
      } else {
        const { data } = await instructoresApi.createInstructor(payload);
        notify(`Instructor creado. Su usuario de acceso es ${data.data.email}; ya puedes subir su diploma`, 'success');
        setForm((f) => ({ ...f, email: data.data.email, usuarioId: data.data.usuarioId }));
        setModal({ editing: data.data.id });
        setDocumentos([]);
      }
      load();
    } catch (err) {
      const data = err.response?.data?.data;
      const errs = data && typeof data === 'object' ? data : {};
      setErrors(errs);
      notify(Object.values(errs)[0] || err.response?.data?.message || 'No se pudo guardar el instructor', 'error');
    }
  }

  async function handleSubirDocumento(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TIPOS_DOCUMENTO.includes(file.type)) {
      notify('Solo se aceptan diplomas o constancias en PDF o imagen (JPG, PNG, WEBP)', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_DOCUMENTO_BYTES) {
      notify(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB`, 'error');
      e.target.value = '';
      return;
    }
    const mensaje = documentos.length
      ? `¿Reemplazar el diploma actual por "${file.name}"? El anterior se eliminará.`
      : `¿Subir "${file.name}" como diploma de ${form.nombre}?`;
    if (!(await confirmarAccion(confirmDialog, mensaje))) {
      e.target.value = '';
      return;
    }
    setSubiendoDocumento(true);
    try {
      await instructoresApi.subirDocumentoInstructor(modal.editing, file);
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
    const ok = await confirmDialog(
      `Desactivar a ${i.nombre}?${i.usuarioId ? ' También se le quitará el acceso al sistema.' : ''}`, { danger: true });
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
              {sucursales.length > 1 && <th>Sucursales</th>}
              <th>Contacto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((i) => (
              <tr key={i.id} className={'border-b border-gray-50 ' + (!i.activo ? 'opacity-50' : '')}>
                <td className="py-2 font-medium text-gray-800">{i.nombre}</td>
                <td className="text-gray-600">{i.disciplinaNombres?.join(', ') || '-'}</td>
                {sucursales.length > 1 && <td className="text-gray-500">{i.sucursalNombres?.join(', ') || 'Todas'}</td>}
                <td className="text-gray-600">
                  {i.telefono || i.emailPersonal || '-'}
                  {i.usuarioId
                    ? <span className="block text-xs text-gray-400">Acceso: {i.email}</span>
                    : <span className="block text-xs text-amber-600">Sin acceso al sistema</span>}
                </td>
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
                <td colSpan={sucursales.length > 1 ? 5 : 4} className="py-6 text-center text-gray-400">
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
            {modal.editing && (
              <div className="flex items-center gap-3">
                {form.fotoUrl ? (
                  <img src={form.fotoUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl">🏋️</div>
                )}
                <label className="btn-secondary text-xs cursor-pointer">
                  {subiendoFoto ? 'Subiendo...' : 'Cambiar foto'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSubirFoto} disabled={subiendoFoto} />
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <PhoneInput value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            </div>
            <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo de acceso <span className="text-red-500">*</span>
                </label>
                <input className="input" type="email" autoComplete="off" placeholder="instructor@tugimnasio.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email
                  ? <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                  : (
                    <p className="text-xs text-gray-500 mt-1">
                      Será su <span className="font-medium">usuario para iniciar sesión</span>. Puede ser un correo institucional o el personal.
                      {form.usuarioId ? ' Si lo cambias, su usuario de login cambia también.' : ' Al guardar se le envía una contraseña temporal.'}
                    </p>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo personal (opcional)</label>
                <input className="input" type="email" autoComplete="off" placeholder="Para contactarlo si el de acceso es institucional"
                  value={form.emailPersonal} onChange={(e) => setForm({ ...form, emailPersonal: e.target.value })} />
                {errors.emailPersonal && <p className="text-xs text-red-600 mt-1">{errors.emailPersonal}</p>}
              </div>
              {modal.editing && !form.usuarioId && (
                <p className="text-xs bg-amber-50 text-amber-800 rounded px-2 py-1">
                  Este instructor aún no tiene acceso al sistema: al guardar se creará con el correo de acceso.
                </p>
              )}
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
            {sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sucursales donde da clases</label>
                <div className="flex flex-wrap gap-2">
                  {sucursales.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSucursal(s.id)}
                      className={
                        'px-3 py-1 rounded-full text-xs border ' +
                        (form.sucursalIds.includes(s.id)
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-300')
                      }
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Sin seleccionar ninguna, este instructor esta disponible en todas.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diploma / Título</label>
              {modal.editing ? (
                <div className="space-y-2">
                  {documentos.length > 0 && (
                    // Un solo archivo por instructor; si quedaron varios de antes, se ven aqui hasta
                    // que se suba uno nuevo (que los reemplaza a todos).
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {documentos.map((d) => (
                        <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <a href={d.ruta} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">
                            {d.nombreOriginal || 'documento'}
                          </a>
                          <button type="button" className="text-red-600 text-xs hover:underline shrink-0 ml-2" onClick={() => eliminarDocumento(d.id)}>
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="btn-secondary cursor-pointer inline-flex items-center px-3 text-sm">
                    {subiendoDocumento ? 'Subiendo...' : documentos.length ? 'Reemplazar archivo' : '+ Subir archivo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleSubirDocumento} disabled={subiendoDocumento} />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Un solo archivo por instructor (diploma, certificado o constancia), en PDF o imagen (JPG, PNG, WEBP). Máximo 5 MB.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Guarda el instructor primero; después podrás subir su diploma aquí mismo.</p>
              )}
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear instructor'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
