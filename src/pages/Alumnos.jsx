import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import PhoneInput from '../components/PhoneInput.jsx';

const emptyForm = {
  nombre: '', fechaNacimiento: '', telefono: '', email: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '', observaciones: '',
  estado: 'ACTIVO', disciplinaIds: [],
};

const ESTADO_LABEL = { ACTIVO: 'Activo', INACTIVO: 'Inactivo', SUSPENDIDO: 'Suspendido' };
const ESTADO_COLOR = { ACTIVO: 'bg-emerald-100 text-emerald-700', INACTIVO: 'bg-gray-100 text-gray-600', SUSPENDIDO: 'bg-amber-100 text-amber-700' };

export default function Alumnos() {
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
    alumnosApi.listAlumnos(q, page, 20).then(({ data }) => setPageData(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setModal({ editing: null });
  }

  function openEdit(a) {
    setForm({
      nombre: a.nombre, fechaNacimiento: a.fechaNacimiento || '', telefono: a.telefono || '', email: a.email || '',
      contactoEmergenciaNombre: a.contactoEmergenciaNombre || '', contactoEmergenciaTelefono: a.contactoEmergenciaTelefono || '',
      observaciones: a.observaciones || '', estado: a.estado, disciplinaIds: a.disciplinaIds || [],
    });
    setErrors({});
    setModal({ editing: a.id });
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
    const payload = { ...form, fechaNacimiento: form.fechaNacimiento || null };
    try {
      if (modal.editing) {
        await alumnosApi.updateAlumno(modal.editing, payload);
        notify('Alumno actualizado', 'success');
      } else {
        await alumnosApi.createAlumno(payload);
        notify('Alumno registrado', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      setErrors(err.response?.data?.data || {});
    }
  }

  async function handleDeactivate(a) {
    const ok = await confirmDialog(`Dar de baja a ${a.nombre}?`, { danger: true });
    if (!ok) return;
    await alumnosApi.deactivateAlumno(a.id);
    notify('Alumno dado de baja', 'success');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Alumnos</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Nuevo alumno
        </button>
      </div>

      <input className="input max-w-xs mb-4" placeholder="Buscar por nombre..." value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Nombre</th>
              <th>Disciplinas</th>
              <th>Estado</th>
              <th>Ingreso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">
                  <Link to={`/alumnos/${a.id}`} className="hover:underline">
                    {a.nombre}
                  </Link>
                </td>
                <td className="text-gray-600">{a.disciplinaNombres?.join(', ') || '-'}</td>
                <td>
                  <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[a.estado]}>{ESTADO_LABEL[a.estado]}</span>
                </td>
                <td className="text-gray-500">{a.fechaIngreso}</td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => openEdit(a)}>
                    Editar
                  </button>
                  {a.estado === 'ACTIVO' && (
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(a)}>
                      Baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar alumno' : 'Nuevo alumno'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input type="date" className="input" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <PhoneInput value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                <input className="input" value={form.contactoEmergenciaNombre} onChange={(e) => setForm({ ...form, contactoEmergenciaNombre: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono de emergencia</label>
                <PhoneInput value={form.contactoEmergenciaTelefono} onChange={(v) => setForm({ ...form, contactoEmergenciaTelefono: v })} />
              </div>
            </div>
            {modal.editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas</label>
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDisciplina(d.id)}
                    className={
                      'px-3 py-1 rounded-full text-xs border ' +
                      (form.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')
                    }
                  >
                    {d.icono} {d.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea className="input" rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Registrar alumno'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
