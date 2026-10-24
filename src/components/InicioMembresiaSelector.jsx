import { useEffect, useState } from 'react';
import * as membresiasApi from '../api/membresias';
import * as sucursalesApi from '../api/sucursales';
import { fechaLocalISO } from '../utils/fechas.js';

// Inicio de vigencia de una membresia dada de alta en mostrador. Por defecto es AUTOMATICO
// segun la regla del backend (InicioMembresiaService): si hoy todavia queda una clase de su
// disciplina con lugares en su sucursal, arranca hoy en cuanto registre asistencia; si no,
// arranca el siguiente dia habil (sin domingos). El mensaje que se muestra viene del
// backend, asi que es exactamente lo que se va a aplicar. Opcionalmente el staff puede fijar
// una fecha FUTURA a proposito (p. ej. empezar el lunes o el 1o de mes).
//
// value = { modo: 'auto' | 'fecha', fecha: 'YYYY-MM-DD', sucursalId: number | '' }
export default function InicioMembresiaSelector({ planId, alumno, disciplinaIds, value, onChange }) {
  const [sucursales, setSucursales] = useState([]);
  const [previo, setPrevio] = useState(null);
  const [cargando, setCargando] = useState(false);
  const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return fechaLocalISO(d); })();

  useEffect(() => {
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data)).catch(() => setSucursales([]));
  }, []);

  // Al elegir alumno, su sucursal es la "de preferencia" por defecto (editable).
  useEffect(() => {
    if (alumno?.sucursalId && !value.sucursalId) onChange({ ...value, sucursalId: alumno.sucursalId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumno?.id]);

  const disciplinasKey = (disciplinaIds || []).join(',');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!planId || value.modo !== 'auto') { setPrevio(null); setCargando(false); return undefined; }
    let vigente = true; // ignora la respuesta si mientras tanto cambio algun dato
    setCargando(true);
    setError(false);
    const t = setTimeout(async () => {
      try {
        const { data } = await membresiasApi.getInicioPrevisto({ planId, alumnoId: alumno?.id, disciplinaIds, sucursalId: value.sucursalId });
        if (vigente) setPrevio(data.data);
      } catch {
        if (vigente) { setPrevio(null); setError(true); }
      } finally {
        if (vigente) setCargando(false);
      }
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, alumno?.id, disciplinasKey, value.sucursalId, value.modo]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inicio de la membresía</label>
          <select className="input" value={value.modo} onChange={(e) => onChange({ ...value, modo: e.target.value })}>
            <option value="auto">Automático (según clases de hoy)</option>
            <option value="fecha">Fecha futura específica</option>
          </select>
        </div>
        {value.modo === 'fecha' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <input className="input" type="date" min={manana} value={value.fecha || manana}
              onChange={(e) => onChange({ ...value, fecha: e.target.value })} />
          </div>
        ) : sucursales.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal de preferencia</label>
            <select className="input" value={value.sucursalId || ''} onChange={(e) => onChange({ ...value, sucursalId: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">Cualquier sucursal</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {value.modo === 'auto' && planId && (
        cargando ? (
          <p className="text-xs text-gray-400">Revisando clases disponibles hoy...</p>
        ) : error ? (
          <p className="text-xs text-amber-700">No se pudieron revisar las clases de hoy; la regla se aplicará igual al guardar.</p>
        ) : previo && (
          <div className={'text-sm rounded-lg px-3 py-2 border ' + (previo.hayClaseHoy
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800')}>
            {previo.hayClaseHoy ? '✅ ' : '⏰ '}{previo.mensaje}
          </div>
        )
      )}
    </div>
  );
}
