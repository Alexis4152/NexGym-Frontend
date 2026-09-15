import { useEffect, useState } from 'react';
import * as clasesApi from '../api/clases';
import * as disciplinasApi from '../api/disciplinas';
import * as instructoresApi from '../api/instructores';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const emptyForm = { disciplinaId: '', instructorId: '', diaSemana: 'LUNES', horaInicio: '18:00', horaFin: '19:00', lugar: '', capacidadMaxima: 20 };

export default function Clases() {
  const [clases, setClases] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    load();
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    instructoresApi.listInstructores('', 0, 100).then(({ data }) => setInstructores(data.data.content));
  }, []);

  function load() {
    clasesApi.listClasesActivas().then(({ data }) => setClases(data.data));
  }

  function openCreate() {
    setForm(emptyForm);
    setModal({ editing: null });
  }

  function openEdit(c) {
    setForm({ disciplinaId: c.disciplinaId, instructorId: c.instructorId || '', diaSemana: c.diaSemana, horaInicio: c.horaInicio, horaFin: c.horaFin, lugar: c.lugar || '', capacidadMaxima: c.capacidadMaxima });
    setModal({ editing: c.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.disciplinaId) {
      notify('Selecciona una disciplina', 'error');
      return;
    }
    const payload = { ...form, instructorId: form.instructorId || null, capacidadMaxima: Number(form.capacidadMaxima) };
    try {
      if (modal.editing) {
        await clasesApi.updateClase(modal.editing, payload);
        notify('Clase actualizada', 'success');
      } else {
        await clasesApi.createClase(payload);
        notify('Clase creada', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la clase', 'error');
    }
  }

  async function handleDeactivate(c) {
    const ok = await confirmDialog('Desactivar esta clase?', { danger: true });
    if (!ok) return;
    await clasesApi.deactivateClase(c.id);
    notify('Clase desactivada', 'success');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Clases y horarios</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Nueva clase
        </button>
      </div>

      <div className="grid gap-3">
        {DIAS.map((dia) => {
          const delDia = clases.filter((c) => c.diaSemana === dia).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          if (delDia.length === 0) return null;
          return (
            <div key={dia} className="card">
              <h3 className="font-semibold text-gray-700 mb-2">{dia.charAt(0) + dia.slice(1).toLowerCase()}</h3>
              <div className="divide-y divide-gray-100">
                {delDia.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{c.disciplinaNombre}</span>
                      <span className="text-gray-500"> · {c.horaInicio.slice(0, 5)}–{c.horaFin.slice(0, 5)}</span>
                      {c.instructorNombre && <span className="text-gray-400"> · {c.instructorNombre}</span>}
                      {c.lugar && <span className="text-gray-400"> · {c.lugar}</span>}
                      <span className="text-gray-400"> · cupo {c.capacidadMaxima}</span>
                    </div>
                    <div className="space-x-2">
                      <button className="text-brand-600 hover:underline" onClick={() => openEdit(c)}>Editar</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(c)}>Desactivar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {clases.length === 0 && <p className="text-sm text-gray-500">Aun no hay clases programadas.</p>}
      </div>

      {modal && (
        <Modal title={modal.editing ? 'Editar clase' : 'Nueva clase'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
              <select className="input" value={form.disciplinaId} onChange={(e) => setForm({ ...form, disciplinaId: e.target.value })}>
                <option value="">Selecciona...</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select className="input" value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
                <option value="">Sin asignar</option>
                {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia</label>
              <select className="input" value={form.diaSemana} onChange={(e) => setForm({ ...form, diaSemana: e.target.value })}>
                {DIAS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                <input type="time" className="input" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                <input type="time" className="input" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                <input className="input" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cupo maximo</label>
                <input type="number" className="input" value={form.capacidadMaxima} onChange={(e) => setForm({ ...form, capacidadMaxima: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary w-full mt-2">{modal.editing ? 'Guardar cambios' : 'Crear clase'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
