import { useEffect, useState } from 'react';
import * as planesApi from '../api/membresiaPlanes';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

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

export default function Planes() {
  const [planes, setPlanes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [modalPlan, setModalPlan] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    cargarPlanes();
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  function cargarPlanes() {
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
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
        <h1 className="text-xl font-bold text-gray-800">Planes de membresia</h1>
        <button className="btn-primary" onClick={openCreatePlan}>+ Plan</button>
      </div>

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
    </div>
  );
}
