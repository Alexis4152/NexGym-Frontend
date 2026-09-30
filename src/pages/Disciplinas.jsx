import { useEffect, useState } from 'react';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const emptyForm = { nombre: '', descripcion: '', icono: '', color: '#1c6690', modalidad: 'CLASES', limiteAlumnos: '', requiereInstalacion: true };

// Set curado para elegir de un vistazo; el campo de texto de al lado sigue libre por
// si quieren pegar otro emoji distinto (ej. desde el selector de emoji del sistema).
const ICONOS_SUGERIDOS = [
  '🥊', '🤼', '🥋', '🧘', '🏋️', '🤸', '🤾', '🏊', '🚴', '🏃',
  '🧗', '🤺', '⚽', '🏀', '🏐', '🎾', '🏓', '🏸', '⛹️', '🥅',
  '🏹', '🤹', '🚵', '🏄', '🤽', '🎽', '🥇', '💪', '❤️‍🔥', '🏅',
];

export default function Disciplinas() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null); // null | { editing }
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    load();
  }, []);

  function load() {
    disciplinasApi.listDisciplinas(0, 100).then(({ data }) => setItems(data.data.content));
  }

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setModal({ editing: null });
  }

  function openEdit(d) {
    setForm({
      nombre: d.nombre,
      descripcion: d.descripcion || '',
      icono: d.icono || '',
      color: d.color || '#1c6690',
      modalidad: d.modalidad,
      limiteAlumnos: d.limiteAlumnos ?? '',
      requiereInstalacion: d.requiereInstalacion ?? true,
    });
    setErrors({});
    setModal({ editing: d.id });
  }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const payload = { ...form, limiteAlumnos: form.limiteAlumnos ? Number(form.limiteAlumnos) : null };
    try {
      if (modal.editing) {
        await disciplinasApi.updateDisciplina(modal.editing, payload);
        notify('Disciplina actualizada', 'success');
      } else {
        await disciplinasApi.createDisciplina(payload);
        notify('Disciplina creada', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      setErrors(err.response?.data?.data || {});
    }
  }

  async function handleDeactivate(d) {
    const ok = await confirmDialog(`Desactivar "${d.nombre}"?`, { danger: true });
    if (!ok) return;
    await disciplinasApi.deactivateDisciplina(d.id);
    notify('Disciplina desactivada', 'success');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Disciplinas</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Nueva disciplina
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((d) => (
          <div key={d.id} className={'card ' + (!d.activo ? 'opacity-50' : '')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{d.icono || '🏅'}</span>
              <h3 className="font-semibold text-gray-800">{d.nombre}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">{d.descripcion}</p>
            <p className="text-xs text-gray-400 mb-3">
              {d.modalidad === 'CLASES' ? 'Por clases' : 'Acceso libre'}
              {d.limiteAlumnos ? ` · limite ${d.limiteAlumnos} alumnos` : ''}
              {d.requiereInstalacion ? ' · requiere instalacion' : ' · sin instalacion especifica'}
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => openEdit(d)}>
                Editar
              </button>
              {d.activo && (
                <button className="btn-danger text-xs" onClick={() => handleDeactivate(d)}>
                  Desactivar
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">Aun no hay disciplinas registradas.</p>}
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar disciplina' : 'Nueva disciplina'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
              <textarea
                className="input"
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icono (emoji)</label>
                <input
                  className="input mb-2"
                  value={form.icono}
                  onChange={(e) => setForm({ ...form, icono: e.target.value })}
                  placeholder="🥊"
                />
                <div className="flex flex-wrap gap-1">
                  {ICONOS_SUGERIDOS.map((icono) => (
                    <button
                      type="button"
                      key={icono}
                      onClick={() => setForm({ ...form, icono })}
                      className={
                        'w-8 h-8 flex items-center justify-center rounded-lg border text-lg leading-none ' +
                        (form.icono === icono ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300')
                      }
                      title={icono}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  className="input h-10"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
                <select
                  className="input"
                  value={form.modalidad}
                  onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                >
                  <option value="CLASES">Por clases</option>
                  <option value="ACCESO_LIBRE">Acceso libre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite de alumnos</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.limiteAlumnos}
                  onChange={(e) => setForm({ ...form, limiteAlumnos: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.requiereInstalacion}
                onChange={(e) => setForm({ ...form, requiereInstalacion: e.target.checked })}
              />
              Requiere seleccionar una instalacion al crear una clase
            </label>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear disciplina'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
