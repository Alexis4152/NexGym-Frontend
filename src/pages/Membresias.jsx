import { useEffect, useState } from 'react';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const ESTADO_COLOR = { ACTIVA: 'bg-emerald-100 text-emerald-700', VENCIDA: 'bg-red-100 text-red-700', CANCELADA: 'bg-gray-100 text-gray-600' };

const emptyPlanForm = {
  nombre: '', tipoPeriodo: 'MENSUAL', duracionDias: '', numeroClasesIncluidas: '', precio: '',
  multidisciplina: false, accesoCompleto: false, limiteAlumnos: '', disciplinaIds: [],
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
  const [asignarForm, setAsignarForm] = useState({ alumnoId: '', planId: '', registrarCobro: true, metodoPago: 'EFECTIVO' });
  const [alumnoQuery, setAlumnoQuery] = useState('');
  const [alumnoResultados, setAlumnoResultados] = useState([]);
  const { notify } = useNotify();

  useEffect(() => {
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
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

  function reloadMembresias() {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }

  async function handleAsignar(e) {
    e.preventDefault();
    if (!asignarForm.alumnoId || !asignarForm.planId) {
      notify('Selecciona un alumno y un plan', 'error');
      return;
    }
    try {
      await membresiasApi.createMembresia(asignarForm);
      notify('Membresia registrada' + (asignarForm.registrarCobro ? ' y cobro capturado en Caja' : ''), 'success');
      setModalAsignar(false);
      setAsignarForm({ alumnoId: '', planId: '', registrarCobro: true, metodoPago: 'EFECTIVO' });
      setAlumnoQuery('');
      reloadMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la membresia', 'error');
    }
  }

  async function handleCancelar(id) {
    await membresiasApi.cancelarMembresia(id);
    notify('Membresia cancelada', 'success');
    reloadMembresias();
  }

  function toggleDisciplinaPlan(id) {
    setPlanForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  async function handleSubmitPlan(e) {
    e.preventDefault();
    const payload = {
      ...planForm,
      duracionDias: planForm.duracionDias ? Number(planForm.duracionDias) : null,
      numeroClasesIncluidas: planForm.numeroClasesIncluidas ? Number(planForm.numeroClasesIncluidas) : null,
      limiteAlumnos: planForm.limiteAlumnos ? Number(planForm.limiteAlumnos) : null,
      precio: Number(planForm.precio),
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
      planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el plan', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Membresias y cobranza</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setPlanForm(emptyPlanForm); setModalPlan({ editing: null }); }}>
            + Plan
          </button>
          <button className="btn-primary" onClick={() => setModalAsignar(true)}>
            + Registrar membresia
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <button className={'pb-2 ' + (tab === 'membresias' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('membresias')}>
          Membresias activas
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
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageData.content.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{m.alumnoNombre}</td>
                  <td className="text-gray-600">{m.planNombre}</td>
                  <td className="text-gray-600">{m.fechaInicio} — {m.fechaFin}</td>
                  <td>
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[m.estado]}>{m.estado}</span>
                  </td>
                  <td className="text-right">
                    {m.estado === 'ACTIVA' && (
                      <button className="text-red-600 hover:underline" onClick={() => handleCancelar(m.id)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pageData.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">Sin membresias registradas</td>
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
              <h3 className="font-semibold text-gray-800">{p.nombre}</h3>
              <p className="text-2xl font-bold text-brand-700 my-1">${Number(p.precio).toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {p.tipoPeriodo.replace('_', ' ')}
                {p.numeroClasesIncluidas ? ` · ${p.numeroClasesIncluidas} clases` : ''}
                {p.accesoCompleto ? ' · acceso completo' : p.multidisciplina ? ' · multidisciplina' : ''}
              </p>
              {p.disciplinaNombres?.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{p.disciplinaNombres.join(', ')}</p>
              )}
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
              <select className="input" value={asignarForm.planId} onChange={(e) => setAsignarForm({ ...asignarForm, planId: e.target.value })}>
                <option value="">Selecciona un plan</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="registrarCobro" checked={asignarForm.registrarCobro} onChange={(e) => setAsignarForm({ ...asignarForm, registrarCobro: e.target.checked })} />
              <label htmlFor="registrarCobro" className="text-sm text-gray-700">Registrar el cobro en Caja</label>
            </div>
            {asignarForm.registrarCobro && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
                <select className="input" value={asignarForm.metodoPago} onChange={(e) => setAsignarForm({ ...asignarForm, metodoPago: e.target.value })}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                <select className="input" value={planForm.tipoPeriodo} onChange={(e) => setPlanForm({ ...planForm, tipoPeriodo: e.target.value })}>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                  <option value="POR_CLASES">Por numero de clases</option>
                  <option value="PERSONALIZADO">Personalizado (dias)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input className="input" type="number" step="0.01" value={planForm.precio} onChange={(e) => setPlanForm({ ...planForm, precio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duracion (dias, opcional)</label>
                <input className="input" type="number" value={planForm.duracionDias} onChange={(e) => setPlanForm({ ...planForm, duracionDias: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clases incluidas (opcional)</label>
                <input className="input" type="number" value={planForm.numeroClasesIncluidas} onChange={(e) => setPlanForm({ ...planForm, numeroClasesIncluidas: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={planForm.multidisciplina} onChange={(e) => setPlanForm({ ...planForm, multidisciplina: e.target.checked })} />
                Multidisciplina
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={planForm.accesoCompleto} onChange={(e) => setPlanForm({ ...planForm, accesoCompleto: e.target.checked })} />
                Acceso completo
              </label>
            </div>
            {!planForm.multidisciplina && !planForm.accesoCompleto && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas incluidas</label>
                <div className="flex flex-wrap gap-2">
                  {disciplinas.map((d) => (
                    <button type="button" key={d.id} onClick={() => toggleDisciplinaPlan(d.id)}
                      className={'px-3 py-1 rounded-full text-xs border ' + (planForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                      {d.icono} {d.nombre}
                    </button>
                  ))}
                </div>
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
    </div>
  );
}
