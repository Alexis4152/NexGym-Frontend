import { useEffect, useMemo, useState } from 'react';
import * as clasesApi from '../api/clases';
import * as disciplinasApi from '../api/disciplinas';
import * as instructoresApi from '../api/instructores';
import * as lugaresApi from '../api/lugares';
import * as sucursalesApi from '../api/sucursales';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const emptyForm = { sucursalId: '', disciplinaId: '', instructorId: '', diaSemana: 'LUNES', horaInicio: '18:00', horaFin: '19:00', lugarId: '', capacidadMaxima: 20 };
const emptyLugarForm = { sucursalId: '', nombre: '', direccion: '', notas: '', capacidadMaxima: '', disciplinaIds: [] };
const emptySucursalForm = { nombre: '', direccion: '', notas: '' };

export default function Clases() {
  const [tab, setTab] = useState('clases');
  const [clases, setClases] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [lugaresFiltrados, setLugaresFiltrados] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [modalLugar, setModalLugar] = useState(null);
  const [lugarForm, setLugarForm] = useState(emptyLugarForm);
  const [modalSucursal, setModalSucursal] = useState(null);
  const [sucursalForm, setSucursalForm] = useState(emptySucursalForm);
  const { notify, confirmDialog } = useNotify();

  const unicaSucursal = sucursales.length === 1 ? sucursales[0] : null;
  const disciplinaSeleccionada = disciplinas.find((d) => String(d.id) === String(form.disciplinaId));
  const requiereInstalacion = disciplinaSeleccionada ? disciplinaSeleccionada.requiereInstalacion : true;
  const instructoresFiltrados = form.disciplinaId
    ? instructores.filter((i) => i.disciplinaIds?.some((id) => String(id) === String(form.disciplinaId)))
    : [];

  useEffect(() => {
    load();
    loadLugares();
    loadSucursales();
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

  function loadLugares() {
    lugaresApi.listLugaresActivos().then(({ data }) => setLugares(data.data));
  }

  function loadSucursales() {
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
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

  function openCreateLugar() {
    setLugarForm({ ...emptyLugarForm, sucursalId: unicaSucursal ? unicaSucursal.id : '' });
    setModalLugar({ editing: null });
  }

  function openEditLugar(l) {
    setLugarForm({
      sucursalId: l.sucursalId, nombre: l.nombre, direccion: l.direccion || '', notas: l.notas || '',
      capacidadMaxima: l.capacidadMaxima ?? '', disciplinaIds: l.disciplinaIds ? [...l.disciplinaIds] : [],
    });
    setModalLugar({ editing: l.id });
  }

  function toggleDisciplinaLugar(id) {
    setLugarForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  async function handleSubmitLugar(e) {
    e.preventDefault();
    if (!lugarForm.nombre.trim()) {
      notify('El nombre del lugar es obligatorio', 'error');
      return;
    }
    if (!lugarForm.sucursalId) {
      notify('Selecciona a que sucursal pertenece', 'error');
      return;
    }
    const payload = { ...lugarForm, capacidadMaxima: lugarForm.capacidadMaxima ? Number(lugarForm.capacidadMaxima) : null };
    try {
      if (modalLugar.editing) {
        await lugaresApi.updateLugar(modalLugar.editing, payload);
        notify('Instalacion actualizada', 'success');
      } else {
        await lugaresApi.createLugar(payload);
        notify('Instalacion creada', 'success');
      }
      setModalLugar(null);
      loadLugares();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la instalacion', 'error');
    }
  }

  async function handleDeactivateLugar(l) {
    const ok = await confirmDialog(`Desactivar "${l.nombre}"?`, { danger: true });
    if (!ok) return;
    await lugaresApi.deactivateLugar(l.id);
    notify('Instalacion desactivada', 'success');
    loadLugares();
  }

  function openCreateSucursal() {
    setSucursalForm(emptySucursalForm);
    setModalSucursal({ editing: null });
  }

  function openEditSucursal(s) {
    setSucursalForm({ nombre: s.nombre, direccion: s.direccion || '', notas: s.notas || '' });
    setModalSucursal({ editing: s.id });
  }

  async function handleSubmitSucursal(e) {
    e.preventDefault();
    if (!sucursalForm.nombre.trim()) {
      notify('El nombre de la sucursal es obligatorio', 'error');
      return;
    }
    try {
      if (modalSucursal.editing) {
        await sucursalesApi.updateSucursal(modalSucursal.editing, sucursalForm);
        notify('Sucursal actualizada', 'success');
      } else {
        await sucursalesApi.createSucursal(sucursalForm);
        notify('Sucursal creada', 'success');
      }
      setModalSucursal(null);
      loadSucursales();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la sucursal', 'error');
    }
  }

  async function handleDeactivateSucursal(s) {
    const ok = await confirmDialog(`Desactivar "${s.nombre}"?`, { danger: true });
    if (!ok) return;
    await sucursalesApi.deactivateSucursal(s.id);
    notify('Sucursal desactivada', 'success');
    loadSucursales();
  }

  const direccionSeleccionada = lugaresFiltrados.find((l) => String(l.id) === String(form.lugarId))?.direccion;
  const lugaresParaModalLugar = useMemo(() => disciplinas, [disciplinas]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Clases y horarios</h1>
        <div className="flex gap-2">
          {tab === 'clases' && (
            <button className="btn-primary" onClick={openCreate}>
              + Nueva clase
            </button>
          )}
          {tab === 'lugares' && (
            <button className="btn-primary" onClick={openCreateLugar}>
              + Instalacion
            </button>
          )}
          {tab === 'sucursales' && (
            <button className="btn-primary" onClick={openCreateSucursal}>
              + Sucursal
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <button className={'pb-2 ' + (tab === 'clases' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('clases')}>
          Clases
        </button>
        <button className={'pb-2 ' + (tab === 'lugares' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('lugares')}>
          Instalaciones
        </button>
        <button className={'pb-2 ' + (tab === 'sucursales' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('sucursales')}>
          Sucursales
        </button>
      </div>

      {tab === 'clases' && (
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
      )}

      {tab === 'lugares' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Nombre</th>
                {sucursales.length > 1 && <th>Sucursal</th>}
                <th>Direccion</th>
                <th>Capacidad</th>
                <th>Disciplinas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lugares.map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{l.nombre}</td>
                  {sucursales.length > 1 && <td className="text-gray-600">{l.sucursalNombre}</td>}
                  <td className="text-gray-600">{l.direccion || '-'}</td>
                  <td className="text-gray-500">{l.capacidadMaxima ?? 'Sin limite'}</td>
                  <td className="text-gray-500">{l.disciplinaNombres?.length ? l.disciplinaNombres.join(', ') : 'Todas'}</td>
                  <td className="text-right space-x-2">
                    <button className="text-brand-600 hover:underline" onClick={() => openEditLugar(l)}>Editar</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivateLugar(l)}>Desactivar</button>
                  </td>
                </tr>
              ))}
              {lugares.length === 0 && (
                <tr>
                  <td colSpan={sucursales.length > 1 ? 6 : 5} className="py-6 text-center text-gray-400">
                    Aun no hay instalaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sucursales' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Nombre</th>
                <th>Direccion</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{s.nombre}</td>
                  <td className="text-gray-600">{s.direccion || '-'}</td>
                  <td className="text-gray-500">{s.notas || '-'}</td>
                  <td className="text-right space-x-2">
                    <button className="text-brand-600 hover:underline" onClick={() => openEditSucursal(s)}>Editar</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivateSucursal(s)}>Desactivar</button>
                  </td>
                </tr>
              ))}
              {sucursales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Aun no hay sucursales registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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

      {modalLugar && (
        <Modal title={modalLugar.editing ? 'Editar instalacion' : 'Nueva instalacion'} onClose={() => setModalLugar(null)}>
          <form onSubmit={handleSubmitLugar} className="space-y-3">
            {sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select className="input" value={lugarForm.sucursalId} onChange={(e) => setLugarForm({ ...lugarForm, sucursalId: e.target.value })}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" placeholder="Ej. Alberca A" value={lugarForm.nombre} onChange={(e) => setLugarForm({ ...lugarForm, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
              <input className="input" placeholder="Ej. Av. Reforma 123, Piso 2" value={lugarForm.direccion} onChange={(e) => setLugarForm({ ...lugarForm, direccion: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad maxima (opcional)</label>
              <input type="number" className="input" value={lugarForm.capacidadMaxima} onChange={(e) => setLugarForm({ ...lugarForm, capacidadMaxima: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas compatibles (vacio = todas)</label>
              <div className="flex flex-wrap gap-2">
                {lugaresParaModalLugar.map((d) => (
                  <button type="button" key={d.id} onClick={() => toggleDisciplinaLugar(d.id)}
                    className={'px-3 py-1 rounded-full text-xs border ' + (lugarForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                    {d.icono} {d.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={lugarForm.notas} onChange={(e) => setLugarForm({ ...lugarForm, notas: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modalLugar.editing ? 'Guardar cambios' : 'Crear instalacion'}</button>
          </form>
        </Modal>
      )}

      {modalSucursal && (
        <Modal title={modalSucursal.editing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={() => setModalSucursal(null)}>
          <form onSubmit={handleSubmitSucursal} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" placeholder="Ej. Sucursal Norte" value={sucursalForm.nombre} onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
              <input className="input" value={sucursalForm.direccion} onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={sucursalForm.notas} onChange={(e) => setSucursalForm({ ...sucursalForm, notas: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modalSucursal.editing ? 'Guardar cambios' : 'Crear sucursal'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
