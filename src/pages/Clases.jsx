import { useEffect, useState } from 'react';
import * as clasesApi from '../api/clases';
import * as disciplinasApi from '../api/disciplinas';
import * as instructoresApi from '../api/instructores';
import * as lugaresApi from '../api/lugares';
import * as sucursalesApi from '../api/sucursales';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const emptyForm = { sucursalId: '', disciplinaId: '', instructorId: '', diaSemana: 'LUNES', horaInicio: '18:00', horaFin: '19:00', lugarId: '', capacidadMaxima: 20 };

export default function Clases() {
  const [clases, setClases] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [lugaresFiltrados, setLugaresFiltrados] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { notify, confirmDialog } = useNotify();
  const { hasPermiso } = useAuth();
  const puedeCrear = hasPermiso('CLASES_CREAR');
  const puedeEditar = hasPermiso('CLASES_EDITAR');
  const puedeCancelar = hasPermiso('CLASES_CANCELAR');

  const unicaSucursal = sucursales.length === 1 ? sucursales[0] : null;
  const disciplinaSeleccionada = disciplinas.find((d) => String(d.id) === String(form.disciplinaId));
  const requiereInstalacion = disciplinaSeleccionada ? disciplinaSeleccionada.requiereInstalacion : true;
  const instructoresFiltrados = form.disciplinaId
    ? instructores.filter((i) =>
        i.disciplinaIds?.some((id) => String(id) === String(form.disciplinaId)) &&
        (!form.sucursalId || !i.sucursalIds?.length || i.sucursalIds.some((id) => String(id) === String(form.sucursalId)))
      )
    : [];

  useEffect(() => {
    load();
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    instructoresApi.listInstructores('', 0, 100).then(({ data }) => setInstructores(data.data.content));
  }, []);

  // Si solo hay una sucursal, se autoselecciona sin mostrar el campo
  useEffect(() => {
    if (unicaSucursal && !form.sucursalId) {
      setForm((f) => ({ ...f, sucursalId: unicaSucursal.id }));
    }
  }, [unicaSucursal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtra las instalaciones disponibles segun sucursal + disciplina elegidas
  useEffect(() => {
    if (!form.sucursalId || !form.disciplinaId) {
      setLugaresFiltrados([]);
      return;
    }
    lugaresApi.listLugaresActivos(form.sucursalId, form.disciplinaId).then(({ data }) => setLugaresFiltrados(data.data));
  }, [form.sucursalId, form.disciplinaId]);

  function load() {
    clasesApi.listClasesActivas().then(({ data }) => setClases(data.data));
  }

  function openCreate() {
    setForm({ ...emptyForm, sucursalId: unicaSucursal ? unicaSucursal.id : '' });
    setModal({ editing: null });
  }

  function openEdit(c) {
    setForm({
      sucursalId: c.sucursalId, disciplinaId: c.disciplinaId, instructorId: c.instructorId || '',
      diaSemana: c.diaSemana, horaInicio: c.horaInicio, horaFin: c.horaFin,
      lugarId: c.lugarId || '', capacidadMaxima: c.capacidadMaxima,
    });
    setModal({ editing: c.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sucursalId) {
      notify('Selecciona una sucursal', 'error');
      return;
    }
    if (!form.disciplinaId) {
      notify('Selecciona una disciplina', 'error');
      return;
    }
    if (requiereInstalacion && !form.lugarId) {
      notify('Esta disciplina requiere seleccionar una instalacion', 'error');
      return;
    }
    const payload = {
      ...form,
      instructorId: form.instructorId || null,
      lugarId: requiereInstalacion ? form.lugarId : null,
      capacidadMaxima: Number(form.capacidadMaxima),
    };
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

  const direccionSeleccionada = lugaresFiltrados.find((l) => String(l.id) === String(form.lugarId))?.direccion;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Clases y horarios</h1>
        {puedeCrear && (
          <button className="btn-primary" onClick={openCreate}>
            + Nueva clase
          </button>
        )}
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
                        {sucursales.length > 1 && c.sucursalNombre && <span className="text-gray-400"> · {c.sucursalNombre}</span>}
                        {c.lugarNombre && <span className="text-gray-400"> · {c.lugarNombre}</span>}
                        <span className="text-gray-400"> · cupo {c.capacidadMaxima}</span>
                        {c.lugarDireccion && <div className="text-xs text-gray-400">{c.lugarDireccion}</div>}
                      </div>
                      {(puedeEditar || puedeCancelar) && (
                        <div className="space-x-2">
                          {puedeEditar && <button className="text-brand-600 hover:underline" onClick={() => openEdit(c)}>Editar</button>}
                          {puedeCancelar && <button className="text-red-600 hover:underline" onClick={() => handleDeactivate(c)}>Desactivar</button>}
                        </div>
                      )}
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
            {sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select className="input" value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value, lugarId: '' })}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
              <select className="input" value={form.disciplinaId} onChange={(e) => setForm({ ...form, disciplinaId: e.target.value, lugarId: '', instructorId: '' })}>
                <option value="">Selecciona...</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select className="input" value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })} disabled={!form.disciplinaId}>
                <option value="">Sin asignar</option>
                {instructoresFiltrados.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
              {form.disciplinaId && instructoresFiltrados.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Ningun instructor registrado imparte esta disciplina.</p>
              )}
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
              {requiereInstalacion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instalacion / Lugar</label>
                  <select className="input" value={form.lugarId} onChange={(e) => setForm({ ...form, lugarId: e.target.value })} disabled={!form.sucursalId || !form.disciplinaId}>
                    <option value="">Selecciona...</option>
                    {lugaresFiltrados.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                  {direccionSeleccionada && <p className="text-xs text-gray-400 mt-1">{direccionSeleccionada}</p>}
                  {form.sucursalId && form.disciplinaId && lugaresFiltrados.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      No hay instalaciones compatibles en esta sucursal para esta disciplina.
                    </p>
                  )}
                </div>
              )}
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
