import { useEffect, useState } from 'react';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';

const emptyForm = {
  alumnoId: '', planId: '', disciplinaIds: [], fechaInicio: new Date().toISOString().slice(0, 10),
  descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO',
};

/** Formulario de alta de membresia, reutilizado por Membresias.jsx y por la pestana
 * de Membresias/Planes del punto de venta. Con `planFijo` el selector de plan se
 * bloquea (ya viene elegido desde el POS); sin el, se comporta como el alta libre
 * de siempre (selecciona su propio plan de la lista de planes activos). */
export default function RegistrarMembresiaForm({ planFijo, onSuccess, onCancel }) {
  const [planes, setPlanes] = useState(planFijo ? [planFijo] : []);
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, planId: planFijo ? planFijo.id : '' });
  const [alumnoQuery, setAlumnoQuery] = useState('');
  const [alumnoResultados, setAlumnoResultados] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    if (!planFijo) {
      planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!alumnoQuery) { setAlumnoResultados([]); return; }
    const t = setTimeout(() => {
      alumnosApi.listAlumnos(alumnoQuery, 0, 8).then(({ data }) => setAlumnoResultados(data.data.content));
    }, 250);
    return () => clearTimeout(t);
  }, [alumnoQuery]);

  const planSeleccionado = planFijo || planes.find((p) => String(p.id) === String(form.planId));
  const totalContratado = planSeleccionado ? Math.max(0, Number(planSeleccionado.precio) - Number(form.descuento || 0)) : 0;

  function toggleDisciplina(id) {
    setForm((f) => {
      const max = planSeleccionado?.maxDisciplinasSeleccionables || 1;
      const yaEsta = f.disciplinaIds.includes(id);
      if (yaEsta) return { ...f, disciplinaIds: f.disciplinaIds.filter((x) => x !== id) };
      if (f.disciplinaIds.length >= max) return f;
      return { ...f, disciplinaIds: [...f.disciplinaIds, id] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.alumnoId || !form.planId) {
      notify('Selecciona un alumno y un plan', 'error');
      return;
    }
    const ok = await confirmDialog(
      `¿Registrar membresia "${planSeleccionado.nombre}" para ${alumnoQuery} por $${totalContratado.toFixed(2)}?`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const { data } = await membresiasApi.createMembresia({
        alumnoId: form.alumnoId,
        planId: form.planId,
        disciplinaIds: form.disciplinaIds,
        fechaInicio: form.fechaInicio,
        descuento: Number(form.descuento || 0),
        montoPagoInicial: form.montoPagoInicial ? Number(form.montoPagoInicial) : null,
        metodoPago: form.metodoPago,
      });
      onSuccess(data.data);
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la membresia', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
        <input className="input" placeholder="Buscar alumno..." value={alumnoQuery} onChange={(e) => setAlumnoQuery(e.target.value)} />
        {alumnoResultados.length > 0 && (
          <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
            {alumnoResultados.map((a) => (
              <button
                type="button"
                key={a.id}
                className={'block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ' + (form.alumnoId === a.id ? 'bg-brand-50 text-brand-700' : '')}
                onClick={() => { setForm({ ...form, alumnoId: a.id }); setAlumnoQuery(a.nombre); setAlumnoResultados([]); }}
              >
                {a.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {planFijo ? (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-sm">
          <span className="font-medium text-brand-800">{planFijo.nombre}</span>
          <span className="text-brand-600"> — ${Number(planFijo.precio).toFixed(2)}</span>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value, disciplinaIds: [] })}>
            <option value="">Selecciona un plan</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>)}
          </select>
        </div>
      )}

      {planSeleccionado && !planSeleccionado.accesoCompleto && planSeleccionado.disciplinaIds?.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Disciplinas (máx. {planSeleccionado.maxDisciplinasSeleccionables || 1})
          </label>
          <div className="flex flex-wrap gap-2">
            {disciplinas.filter((d) => planSeleccionado.disciplinaIds.includes(d.id)).map((d) => (
              <button type="button" key={d.id} onClick={() => toggleDisciplina(d.id)}
                className={'px-3 py-1 rounded-full text-xs border ' + (form.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                {d.icono} {d.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
          <input className="input" type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
          <input className="input" type="number" step="0.01" value={form.descuento} onChange={(e) => setForm({ ...form, descuento: e.target.value })} />
        </div>
      </div>
      {planSeleccionado && (
        <p className="text-sm text-gray-600">Total contratado: <strong>${totalContratado.toFixed(2)}</strong></p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pago inicial (opcional)</label>
          <input className="input" type="number" step="0.01" value={form.montoPagoInicial} onChange={(e) => setForm({ ...form, montoPagoInicial: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
          <select className="input" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
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
      <div className="flex gap-2 mt-2">
        {onCancel && <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>}
        <button className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Registrando...' : 'Registrar'}</button>
      </div>
    </form>
  );
}
