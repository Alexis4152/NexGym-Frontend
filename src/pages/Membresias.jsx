import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const ESTADO_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDA: 'bg-orange-100 text-orange-700',
  VENCIDA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-600',
};
const INDICADOR_LABEL = {
  PROXIMA_A_VENCER: 'Próxima a vencer',
  SALDO_PENDIENTE: 'Saldo pendiente',
  PAGO_VENCIDO: 'Pago vencido',
  CLASES_POR_AGOTARSE: 'Clases por agotarse',
  AGOTADA: 'Agotada',
};

const TIPOS_PLAN = [
  { value: 'PERIODO', label: 'Por periodo (semanal, mensual, anual...)' },
  { value: 'POR_CLASES', label: 'Por numero de clases' },
  { value: 'PASE', label: 'Pase / clase individual' },
  { value: 'PERSONALIZADO', label: 'Personalizado' },
];
const UNIDADES = [
  { value: 'DIA', label: 'Dia(s)' },
  { value: 'SEMANA', label: 'Semana(s)' },
  { value: 'MES', label: 'Mes(es)' },
  { value: 'ANIO', label: 'Año(s)' },
];

const emptyPlanForm = {
  nombre: '', tipoPlan: 'PERIODO', duracionCantidad: '1', duracionUnidad: 'MES', numeroClasesIncluidas: '',
  precio: '', accesoCompleto: false, maxDisciplinasSeleccionables: '1', permiteAbonos: false, montoMinimoAbono: '',
  limiteAlumnos: '', disciplinaIds: [],
};
const emptyAsignarForm = {
  alumnoId: '', planId: '', disciplinaIds: [], fechaInicio: new Date().toISOString().slice(0, 10),
  descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO',
};

export default function Membresias() {
  const [tab, setTab] = useState('membresias');
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [planes, setPlanes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalPlan, setModalPlan] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [asignarForm, setAsignarForm] = useState(emptyAsignarForm);
  const [alumnoQuery, setAlumnoQuery] = useState('');
  const [alumnoResultados, setAlumnoResultados] = useState([]);
  const [modalMotivo, setModalMotivo] = useState(null); // { id, motivo }
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    cargarPlanes();
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  useEffect(() => {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }, [page]);

  useEffect(() => {
    if (!alumnoQuery) { setAlumnoResultados([]); return; }
    const t = setTimeout(() => {
      alumnosApi.listAlumnos(alumnoQuery, 0, 8).then(({ data }) => setAlumnoResultados(data.data.content));
    }, 250);
    return () => clearTimeout(t);
  }, [alumnoQuery]);

  function cargarPlanes() {
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
  }

  function reloadMembresias() {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }

  const planSeleccionado = planes.find((p) => String(p.id) === String(asignarForm.planId));
  const totalContratado = planSeleccionado ? Math.max(0, Number(planSeleccionado.precio) - Number(asignarForm.descuento || 0)) : 0;

  function toggleDisciplinaAsignar(id) {
    setAsignarForm((f) => {
      const max = planSeleccionado?.maxDisciplinasSeleccionables || 1;
      const yaEsta = f.disciplinaIds.includes(id);
      if (yaEsta) return { ...f, disciplinaIds: f.disciplinaIds.filter((x) => x !== id) };
      if (f.disciplinaIds.length >= max) return f;
      return { ...f, disciplinaIds: [...f.disciplinaIds, id] };
    });
  }

  async function handleAsignar(e) {
    e.preventDefault();
    if (!asignarForm.alumnoId || !asignarForm.planId) {
      notify('Selecciona un alumno y un plan', 'error');
      return;
    }
    try {
      await membresiasApi.createMembresia({
        alumnoId: asignarForm.alumnoId,
        planId: asignarForm.planId,
        disciplinaIds: asignarForm.disciplinaIds,
        fechaInicio: asignarForm.fechaInicio,
        descuento: Number(asignarForm.descuento || 0),
        montoPagoInicial: asignarForm.montoPagoInicial ? Number(asignarForm.montoPagoInicial) : null,
        metodoPago: asignarForm.metodoPago,
      });
      notify('Membresia registrada', 'success');
      setModalAsignar(false);
      setAsignarForm(emptyAsignarForm);
      setAlumnoQuery('');
      reloadMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la membresia', 'error');
    }
  }

  async function handleCancelarSubmit(e) {
    e.preventDefault();
    if (!modalMotivo.motivo.trim()) {
      notify('El motivo es obligatorio', 'error');
      return;
    }
    try {
      await membresiasApi.cancelarMembresia(modalMotivo.id, modalMotivo.motivo);
      notify('Membresia cancelada', 'success');
      setModalMotivo(null);
      reloadMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  function toggleDisciplinaPlan(id) {
    setPlanForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  function openCreatePlan() {
    setPlanForm(emptyPlanForm);
    setModalPlan({ editing: null });
  }

  function openEditPlan(p) {
    setPlanForm({
      nombre: p.nombre, tipoPlan: p.tipoPlan, duracionCantidad: p.duracionCantidad ?? '', duracionUnidad: p.duracionUnidad || 'MES',
      numeroClasesIncluidas: p.numeroClasesIncluidas ?? '', precio: p.precio, accesoCompleto: p.accesoCompleto,
      maxDisciplinasSeleccionables: p.maxDisciplinasSeleccionables ?? '1', permiteAbonos: p.permiteAbonos,
      montoMinimoAbono: p.montoMinimoAbono ?? '', limiteAlumnos: p.limiteAlumnos ?? '', disciplinaIds: p.disciplinaIds ? [...p.disciplinaIds] : [],
    });
    setModalPlan({ editing: p.id });
  }

  async function handleSubmitPlan(e) {
    e.preventDefault();
    const payload = {
      nombre: planForm.nombre,
      tipoPlan: planForm.tipoPlan,
      duracionCantidad: planForm.tipoPlan !== 'POR_CLASES' || planForm.duracionCantidad ? (planForm.duracionCantidad ? Number(planForm.duracionCantidad) : null) : null,
      duracionUnidad: planForm.duracionCantidad ? planForm.duracionUnidad : null,
      numeroClasesIncluidas: planForm.numeroClasesIncluidas ? Number(planForm.numeroClasesIncluidas) : null,
      precio: Number(planForm.precio),
      accesoCompleto: planForm.accesoCompleto,
      maxDisciplinasSeleccionables: planForm.maxDisciplinasSeleccionables ? Number(planForm.maxDisciplinasSeleccionables) : null,
      permiteAbonos: planForm.permiteAbonos,
      montoMinimoAbono: planForm.permiteAbonos && planForm.montoMinimoAbono ? Number(planForm.montoMinimoAbono) : null,
      limiteAlumnos: planForm.limiteAlumnos ? Number(planForm.limiteAlumnos) : null,
      disciplinaIds: planForm.accesoCompleto ? [] : planForm.disciplinaIds,
    };
    try {
      if (modalPlan.editing) {
        await planesApi.updateMembresiaPlan(modalPlan.editing, payload);
        notify('Plan actualizado', 'success');
      } else {
        await planesApi.createMembresiaPlan(payload);
        notify('Plan creado', 'success');
      }
      setModalPlan(null);
      cargarPlanes();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el plan', 'error');
    }
  }

  async function handleDeactivatePlan(p) {
    const ok = await confirmDialog(`Desactivar el plan "${p.nombre}"?`, { danger: true });
    if (!ok) return;
    await planesApi.deactivateMembresiaPlan(p.id);
    notify('Plan desactivado', 'success');
    cargarPlanes();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Membresias y cobranza</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={openCreatePlan}>+ Plan</button>
          <button className="btn-primary" onClick={() => setModalAsignar(true)}>+ Registrar membresia</button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <button className={'pb-2 ' + (tab === 'membresias' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('membresias')}>
          Membresias
        </button>
        <button className={'pb-2 ' + (tab === 'planes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('planes')}>
          Planes
        </button>
      </div>

      {tab === 'membresias' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Alumno</th>
                <th>Plan</th>
                <th>Vigencia</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageData.content.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">
                    <Link to={`/alumnos/${m.alumnoId}`} className="hover:underline">{m.alumnoNombre}</Link>
                  </td>
                  <td className="text-gray-600">{m.planNombre}</td>
                  <td className="text-gray-600">{m.fechaInicio} — {m.fechaFin || 'sin fecha'}</td>
                  <td className="text-gray-600">${Number(m.saldo).toFixed(2)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[m.estado]}>{m.estado}</span>
                      {m.indicadores?.map((ind) => (
                        <span key={ind} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">{INDICADOR_LABEL[ind] || ind}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right space-x-2">
                    <Link to={`/alumnos/${m.alumnoId}`} className="text-brand-600 hover:underline">Ver</Link>
                    {m.estado !== 'CANCELADA' && (
                      <button className="text-red-600 hover:underline" onClick={() => setModalMotivo({ id: m.id, motivo: '' })}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pageData.content.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">Sin membresias registradas</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
        </div>
      )}

      {tab === 'planes' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planes.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-800">{p.nombre}</h3>
                <div className="space-x-2 text-xs">
                  <button className="text-brand-600 hover:underline" onClick={() => openEditPlan(p)}>Editar</button>
                  <button className="text-red-600 hover:underline" onClick={() => handleDeactivatePlan(p)}>Desactivar</button>
                </div>
              </div>
              <p className="text-2xl font-bold text-brand-700 my-1">${Number(p.precio).toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {p.tipoPlan === 'PERIODO' && `${p.duracionCantidad} ${p.duracionUnidad?.toLowerCase()}(s)`}
                {p.tipoPlan === 'POR_CLASES' && `${p.numeroClasesIncluidas} clases${p.duracionCantidad ? ` · vigencia ${p.duracionCantidad} ${p.duracionUnidad?.toLowerCase()}(s)` : ' · sin vencimiento'}`}
                {p.tipoPlan === 'PASE' && '1 clase individual'}
                {p.tipoPlan === 'PERSONALIZADO' && 'Personalizado'}
                {p.accesoCompleto ? ' · acceso completo' : p.disciplinaNombres?.length > 1 ? ` · hasta ${p.maxDisciplinasSeleccionables} disciplinas` : ''}
              </p>
              {p.disciplinaNombres?.length > 0 && <p className="text-xs text-gray-400 mt-1">{p.disciplinaNombres.join(', ')}</p>}
              {p.permiteAbonos && <p className="text-xs text-emerald-600 mt-1">Permite abonos{p.montoMinimoAbono ? ` (min. $${Number(p.montoMinimoAbono).toFixed(2)})` : ''}</p>}
            </div>
          ))}
          {planes.length === 0 && <p className="text-sm text-gray-500">Aun no hay planes de membresia.</p>}
        </div>
      )}

      {modalAsignar && (
        <Modal title="Registrar membresia" onClose={() => setModalAsignar(false)}>
          <form onSubmit={handleAsignar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
              <input className="input" placeholder="Buscar alumno..." value={alumnoQuery} onChange={(e) => setAlumnoQuery(e.target.value)} />
              {alumnoResultados.length > 0 && (
                <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {alumnoResultados.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      className={'block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ' + (asignarForm.alumnoId === a.id ? 'bg-brand-50 text-brand-700' : '')}
                      onClick={() => { setAsignarForm({ ...asignarForm, alumnoId: a.id }); setAlumnoQuery(a.nombre); setAlumnoResultados([]); }}
                    >
                      {a.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input" value={asignarForm.planId} onChange={(e) => setAsignarForm({ ...asignarForm, planId: e.target.value, disciplinaIds: [] })}>
                <option value="">Selecciona un plan</option>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>)}
              </select>
            </div>
            {planSeleccionado && !planSeleccionado.accesoCompleto && planSeleccionado.disciplinaIds?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplinas (máx. {planSeleccionado.maxDisciplinasSeleccionables || 1})
                </label>
                <div className="flex flex-wrap gap-2">
                  {disciplinas.filter((d) => planSeleccionado.disciplinaIds.includes(d.id)).map((d) => (
                    <button type="button" key={d.id} onClick={() => toggleDisciplinaAsignar(d.id)}
                      className={'px-3 py-1 rounded-full text-xs border ' + (asignarForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                      {d.icono} {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                <input className="input" type="date" value={asignarForm.fechaInicio} onChange={(e) => setAsignarForm({ ...asignarForm, fechaInicio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                <input className="input" type="number" step="0.01" value={asignarForm.descuento} onChange={(e) => setAsignarForm({ ...asignarForm, descuento: e.target.value })} />
              </div>
            </div>
            {planSeleccionado && (
              <p className="text-sm text-gray-600">Total contratado: <strong>${totalContratado.toFixed(2)}</strong></p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pago inicial (opcional)</label>
                <input className="input" type="number" step="0.01" value={asignarForm.montoPagoInicial} onChange={(e) => setAsignarForm({ ...asignarForm, montoPagoInicial: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select className="input" value={asignarForm.metodoPago} onChange={(e) => setAsignarForm({ ...asignarForm, metodoPago: e.target.value })}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            {planSeleccionado && !planSeleccionado.permiteAbonos && (
              <p className="text-xs text-gray-400">Este plan no permite abonos: deja el pago inicial en 0 para cobrar despues, o cubre el total.</p>
            )}
            <button className="btn-primary w-full mt-2">Registrar</button>
          </form>
        </Modal>
      )}

      {modalPlan && (
        <Modal title={modalPlan.editing ? 'Editar plan' : 'Nuevo plan de membresia'} onClose={() => setModalPlan(null)}>
          <form onSubmit={handleSubmitPlan} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" value={planForm.nombre} onChange={(e) => setPlanForm({ ...planForm, nombre: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="input" value={planForm.tipoPlan} onChange={(e) => setPlanForm({ ...planForm, tipoPlan: e.target.value })}>
                  {TIPOS_PLAN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input className="input" type="number" step="0.01" value={planForm.precio} onChange={(e) => setPlanForm({ ...planForm, precio: e.target.value })} />
              </div>
            </div>

            {(planForm.tipoPlan === 'PERIODO' || planForm.tipoPlan === 'PERSONALIZADO') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duracion (cantidad)</label>
                  <input className="input" type="number" value={planForm.duracionCantidad} onChange={(e) => setPlanForm({ ...planForm, duracionCantidad: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select className="input" value={planForm.duracionUnidad} onChange={(e) => setPlanForm({ ...planForm, duracionUnidad: e.target.value })}>
                    {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            {(planForm.tipoPlan === 'POR_CLASES' || planForm.tipoPlan === 'PERSONALIZADO') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero de clases incluidas</label>
                <input className="input" type="number" value={planForm.numeroClasesIncluidas} onChange={(e) => setPlanForm({ ...planForm, numeroClasesIncluidas: e.target.value })} />
              </div>
            )}
            {planForm.tipoPlan === 'POR_CLASES' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia adicional (opcional)</label>
                  <input className="input" type="number" placeholder="Cantidad" value={planForm.duracionCantidad} onChange={(e) => setPlanForm({ ...planForm, duracionCantidad: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                  <select className="input" value={planForm.duracionUnidad} onChange={(e) => setPlanForm({ ...planForm, duracionUnidad: e.target.value })}>
                    {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            {planForm.tipoPlan === 'PASE' && (
              <p className="text-xs text-gray-400">Un pase siempre equivale a 1 clase individual, sin vigencia por fecha.</p>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={planForm.accesoCompleto} onChange={(e) => setPlanForm({ ...planForm, accesoCompleto: e.target.checked })} />
              Acceso a todas las disciplinas, sin limite
            </label>

            {!planForm.accesoCompleto && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas permitidas</label>
                  <div className="flex flex-wrap gap-2">
                    {disciplinas.map((d) => (
                      <button type="button" key={d.id} onClick={() => toggleDisciplinaPlan(d.id)}
                        className={'px-3 py-1 rounded-full text-xs border ' + (planForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                        {d.icono} {d.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                {planForm.disciplinaIds.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuantas puede elegir el alumno (máx. {planForm.disciplinaIds.length})
                    </label>
                    <input className="input" type="number" min="1" max={planForm.disciplinaIds.length}
                      value={planForm.maxDisciplinasSeleccionables}
                      onChange={(e) => setPlanForm({ ...planForm, maxDisciplinasSeleccionables: e.target.value })} />
                  </div>
                )}
              </>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={planForm.permiteAbonos} onChange={(e) => setPlanForm({ ...planForm, permiteAbonos: e.target.checked })} />
              Permite abonos (pagos parciales)
            </label>
            {planForm.permiteAbonos && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pago minimo inicial (opcional)</label>
                <input className="input" type="number" step="0.01" value={planForm.montoMinimoAbono} onChange={(e) => setPlanForm({ ...planForm, montoMinimoAbono: e.target.value })} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite de alumnos con este plan (opcional)</label>
              <input className="input" type="number" value={planForm.limiteAlumnos} onChange={(e) => setPlanForm({ ...planForm, limiteAlumnos: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modalPlan.editing ? 'Guardar cambios' : 'Crear plan'}</button>
          </form>
        </Modal>
      )}

      {modalMotivo && (
        <Modal title="Cancelar membresia" onClose={() => setModalMotivo(null)}>
          <form onSubmit={handleCancelarSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (obligatorio)</label>
              <textarea className="input" rows={3} value={modalMotivo.motivo} onChange={(e) => setModalMotivo({ ...modalMotivo, motivo: e.target.value })} />
            </div>
            <button className="btn-danger w-full mt-2">Cancelar membresia</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
