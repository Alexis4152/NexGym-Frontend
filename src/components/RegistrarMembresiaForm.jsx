import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import * as cortesCajaApi from '../api/cortesCaja';
import { useNotify } from '../context/NotifyContext.jsx';
import { describirPlan, planLleno, textoCupo } from '../utils/planes.js';
import InicioMembresiaSelector from './InicioMembresiaSelector.jsx';
import MembresiaRegistradaPanel from './MembresiaRegistradaPanel.jsx';

const emptyForm = {
  alumnoId: '', planId: '', disciplinaIds: [],
  descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO',
};

// Un QR leido por un lector "escribe" el token completo + Enter; una busqueda a mano
// nunca llega a esta longitud (ver misma nota en Asistencia.jsx).
const LARGO_MINIMO_QR = 20;

/** Formulario de alta de membresia, reutilizado por Membresias.jsx y por la pestana
 * de Membresias/Planes del punto de venta. Con `planFijo` el selector de plan se
 * bloquea (ya viene elegido desde el POS); sin el, se comporta como el alta libre
 * de siempre (selecciona su propio plan de la lista de planes activos). */
export default function RegistrarMembresiaForm({ planFijo, onSuccess, onCancel }) {
  const [planes, setPlanes] = useState(planFijo ? [planFijo] : []);
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState(() => ({ ...emptyForm, planId: planFijo ? planFijo.id : '' }));
  // Alumno elegido completo (su sucursal es la "de preferencia" por defecto para la regla de inicio).
  const [alumnoSel, setAlumnoSel] = useState(null);
  // Inicio de vigencia: automatico por clases de hoy (default) o una fecha futura elegida.
  const [inicio, setInicio] = useState({ modo: 'auto', fecha: '', sucursalId: '' });
  const [alumnoQuery, setAlumnoQuery] = useState('');
  const [alumnoResultados, setAlumnoResultados] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [corteAbierto, setCorteAbierto] = useState(null);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    if (!planFijo) {
      planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
    }
    // Igual que en el POS: se cobra al registrar (montoPagoInicial), asi que exige un
    // corte de caja propio abierto (ver MembresiaService#assertCorteAbierto).
    cortesCajaApi.getCorteAbierto().then(({ data }) => setCorteAbierto(data.data));
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
  // Pago inicial = lo que entrega el cliente. En efectivo puede pasar del total: se abona hasta
  // el total y el resto es cambio (mismo calculo que el backend).
  const recibido = Number(form.montoPagoInicial || 0);
  const esEfectivo = form.metodoPago === 'EFECTIVO';
  const cambio = esEfectivo ? Math.max(0, recibido - totalContratado) : 0;
  // Despues de registrar: pantalla final con cambio y ticket.
  const [registrada, setRegistrada] = useState(null); // { membresia, cambio }

  function toggleDisciplina(id) {
    setForm((f) => {
      const max = planSeleccionado?.maxDisciplinasSeleccionables || 1;
      const yaEsta = f.disciplinaIds.includes(id);
      if (yaEsta) return { ...f, disciplinaIds: f.disciplinaIds.filter((x) => x !== id) };
      if (f.disciplinaIds.length >= max) return f;
      return { ...f, disciplinaIds: [...f.disciplinaIds, id] };
    });
  }

  async function handleAlumnoKeyDown(e) {
    if (e.key !== 'Enter' || alumnoQuery.trim().length < LARGO_MINIMO_QR) return;
    e.preventDefault();
    try {
      const { data } = await alumnosApi.buscarAlumnoPorQr(alumnoQuery.trim());
      setForm((f) => ({ ...f, alumnoId: data.data.id }));
      setAlumnoSel(data.data);
      setAlumnoQuery(data.data.nombre);
      setAlumnoResultados([]);
    } catch {
      notify('Ningun alumno tiene ese codigo QR', 'error');
    }
  }

  function seleccionarPlan(p) {
    if (planLleno(p)) {
      notify('Este plan ya alcanzo su cupo maximo de alumnos', 'error');
      return;
    }
    setForm((f) => ({ ...f, planId: p.id, disciplinaIds: [] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!corteAbierto) {
      notify('Debes abrir un corte de caja antes de registrar una membresia', 'error');
      return;
    }
    if (!form.alumnoId || !form.planId) {
      notify('Selecciona un alumno y un plan', 'error');
      return;
    }
    if (planSeleccionado && planLleno(planSeleccionado)) {
      notify('Este plan ya alcanzo su cupo maximo de alumnos', 'error');
      return;
    }
    if (!esEfectivo && recibido > totalContratado) {
      notify(`Con ${form.metodoPago.toLowerCase()} no hay cambio: el pago no puede pasar del total ($${totalContratado.toFixed(2)})`, 'error');
      return;
    }
    const ok = await confirmDialog(
      `¿Registrar membresia "${planSeleccionado.nombre}" para ${alumnoQuery} por $${totalContratado.toFixed(2)}?` +
      (cambio > 0 ? ` Cambio a entregar: $${cambio.toFixed(2)}.` : '')
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const { data } = await membresiasApi.createMembresia({
        alumnoId: form.alumnoId,
        planId: form.planId,
        disciplinaIds: form.disciplinaIds,
        // null = automatico (el backend aplica la regla de clase disponible hoy)
        fechaInicio: inicio.modo === 'fecha' && inicio.fecha ? inicio.fecha : null,
        sucursalPreferidaId: inicio.sucursalId || null,
        descuento: Number(form.descuento || 0),
        montoPagoInicial: form.montoPagoInicial ? Number(form.montoPagoInicial) : null,
        metodoPago: form.metodoPago,
      });
      setRegistrada({ membresia: data.data, cambio });
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la membresia', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (registrada) {
    return (
      <MembresiaRegistradaPanel
        membresiaId={registrada.membresia.id}
        cambio={registrada.cambio}
        onListo={() => onSuccess(registrada.membresia)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!corteAbierto && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
          ⚠️ No hay corte de caja abierto. Debes <Link to="/cortes-caja" className="underline font-semibold">abrir un corte</Link> antes de poder registrar una membresía.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alumno (o escanea su QR)</label>
        <input className="input" placeholder="Buscar alumno o escanea su QR..." value={alumnoQuery}
          onChange={(e) => setAlumnoQuery(e.target.value)} onKeyDown={handleAlumnoKeyDown} />
        {alumnoResultados.length > 0 && (
          <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
            {alumnoResultados.map((a) => (
              <button
                type="button"
                key={a.id}
                className={'block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ' + (form.alumnoId === a.id ? 'bg-brand-50 text-brand-700' : '')}
                onClick={() => { setForm({ ...form, alumnoId: a.id }); setAlumnoSel(a); setAlumnoQuery(a.nombre); setAlumnoResultados([]); }}
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
          <p className="text-xs text-brand-600 mt-1">{describirPlan(planFijo)}</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan (selecciona uno para ver su informacion)</label>
          <div className="grid grid-cols-2 gap-2">
            {planes.map((p) => {
              const lleno = planLleno(p);
              const seleccionado = String(form.planId) === String(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => seleccionarPlan(p)}
                  className={
                    'text-left rounded-lg border px-3 py-2 text-sm transition-colors ' +
                    (lleno ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                      : seleccionado ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300')
                  }
                >
                  <p className="font-medium text-gray-800">{p.nombre}</p>
                  <p className="text-brand-700 font-bold">${Number(p.precio).toFixed(2)}</p>
                  {textoCupo(p) && (
                    <p className={'text-xs mt-0.5 ' + (lleno ? 'text-red-500' : 'text-gray-400')}>{textoCupo(p)}</p>
                  )}
                </button>
              );
            })}
            {planes.length === 0 && <p className="text-sm text-gray-400 col-span-2">No hay planes activos.</p>}
          </div>
          {planSeleccionado && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
              {describirPlan(planSeleccionado)}
            </div>
          )}
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

      <InicioMembresiaSelector
        planId={form.planId}
        alumno={alumnoSel}
        disciplinaIds={form.disciplinaIds}
        value={inicio}
        onChange={setInicio}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
        <input className="input" type="number" step="0.01" value={form.descuento} onChange={(e) => setForm({ ...form, descuento: e.target.value })} />
      </div>
      {planSeleccionado && (
        <p className="text-sm text-gray-600">Total contratado: <strong>${totalContratado.toFixed(2)}</strong></p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {esEfectivo ? 'Recibido en efectivo (opcional)' : 'Pago inicial (opcional)'}
          </label>
          <input className="input" type="number" step="0.01" value={form.montoPagoInicial} onChange={(e) => setForm({ ...form, montoPagoInicial: e.target.value })} />
          {totalContratado > 0 && !form.montoPagoInicial && (
            <button type="button" className="text-xs text-brand-600 hover:underline mt-1"
              onClick={() => setForm({ ...form, montoPagoInicial: String(totalContratado) })}>
              Cobrar exacto (${totalContratado.toFixed(2)})
            </button>
          )}
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
      {cambio > 0 && (
        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <span className="text-sm text-emerald-800">Cambio a entregar</span>
          <span className="text-xl font-bold text-emerald-700">${cambio.toFixed(2)}</span>
        </div>
      )}
      {!esEfectivo && recibido > totalContratado && (
        <p className="text-xs text-red-600">Con {form.metodoPago.toLowerCase()} no hay cambio: el pago no puede pasar de ${totalContratado.toFixed(2)}.</p>
      )}
      {planSeleccionado && !planSeleccionado.permiteAbonos && (
        <p className="text-xs text-gray-400">Este plan no permite abonos: deja el pago inicial en 0 para cobrar despues, o cubre el total.</p>
      )}
      <div className="flex gap-2 mt-2">
        {onCancel && <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>}
        <button className="btn-primary flex-1" disabled={submitting || !corteAbierto}>{submitting ? 'Registrando...' : 'Registrar'}</button>
      </div>
    </form>
  );
}
