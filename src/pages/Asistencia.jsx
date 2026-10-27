import { useEffect, useState } from 'react';
import * as asistenciasApi from '../api/asistencias';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';
import CamaraScanner from '../components/CamaraScanner.jsx';

// Un QR/codigo de barras leido por un lector fisico se "escribe" completo y termina
// en Enter; un nombre tecleado a mano nunca llega a esta longitud, asi que solo ahi
// vale la pena intentar la busqueda por QR (evita un aviso de error en cada Enter
// accidental de una busqueda por nombre normal).
const LARGO_MINIMO_QR = 20;

export default function Asistencia() {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [disciplinaId, setDisciplinaId] = useState('');
  const [disciplinas, setDisciplinas] = useState([]);
  const [hoy, setHoy] = useState([]);
  const { notify, confirmDialog } = useNotify();
  // El Entrenador ya no lo trae por defecto: sin el permiso solo ve los registros.
  const { hasPermiso } = useAuth();
  const puedeRegistrar = hasPermiso('ASISTENCIAS_REGISTRAR');
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  useEffect(() => {
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    loadHoy();
  }, []);

  useEffect(() => {
    if (!q) { setResultados([]); return; }
    const t = setTimeout(() => {
      alumnosApi.listAlumnos(q, 0, 8).then(({ data }) => setResultados(data.data.content));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function loadHoy() {
    asistenciasApi.listAsistencias(0, 20).then(({ data }) => setHoy(data.data.content));
  }

  // Escanear el QR registra directo (el escaneo ya es la confirmacion y no frena la fila en
  // recepcion); elegir al alumno a mano de la busqueda si pide confirmar.
  async function registrar(alumno, { porQr = false } = {}) {
    const disciplina = disciplinas.find((d) => String(d.id) === String(disciplinaId))?.nombre;
    if (!porQr && !(await confirmarAccion(confirmDialog,
      `¿Registrar la asistencia de ${alumno.nombre}${disciplina ? ` a ${disciplina}` : ''}?`,
      { title: 'Confirmar asistencia', confirmLabel: 'Sí, registrar' }))) return;
    try {
      await asistenciasApi.registrarAsistencia({ alumnoId: alumno.id, disciplinaId: disciplinaId || null });
      const mensaje = `Asistencia registrada: ${alumno.nombre}${disciplina ? ` (${disciplina})` : ''}`;
      notify(mensaje, 'success');
      setQ('');
      setResultados([]);
      loadHoy();
      return { ok: true, mensaje };
    } catch (err) {
      const mensaje = err.response?.data?.message || `No se pudo registrar la asistencia de ${alumno.nombre}`;
      notify(mensaje, 'error');
      return { ok: false, mensaje };
    }
  }

  /** QR leido por lector fisico (Enter en el campo) o por la camara: registra directo. */
  async function registrarPorQr(codigo) {
    let alumno;
    try {
      const { data } = await alumnosApi.buscarAlumnoPorQr(codigo.trim());
      alumno = data.data;
    } catch (err) {
      const mensaje = err.response?.data?.message || 'Ningún alumno tiene ese código QR';
      notify(mensaje, 'error');
      return { ok: false, mensaje };
    }
    return registrar(alumno, { porQr: true });
  }

  async function handleKeyDown(e) {
    if (e.key !== 'Enter' || q.trim().length < LARGO_MINIMO_QR) return;
    await registrarPorQr(q);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Asistencia</h1>

      {puedeRegistrar && (
      <div className="card max-w-lg mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina (opcional)</label>
        <select className="input mb-4" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
          <option value="">General / acceso libre</option>
          {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar alumno para pasar lista (o escanea su QR)</label>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Nombre del alumno o escanea su QR..." value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
          <button type="button" className="btn-secondary shrink-0 px-3" onClick={() => setCamaraAbierta(true)}
            title="Escanear el QR con la cámara del celular o tablet">
            📷 <span className="hidden sm:inline">Cámara</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Sin lector: toca 📷 y apunta la cámara al QR del alumno.</p>

        {resultados.length > 0 && (
          <div className="mt-2 divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {resultados.map((a) => (
              <button key={a.id} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between" onClick={() => registrar(a)}>
                <span>{a.nombre}</span>
                <span className="text-brand-600">Registrar ✓</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Ultimos registros</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Alumno</th>
              <th>Disciplina</th>
              <th>Fecha</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {hoy.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-800">{a.alumnoNombre}</td>
                <td className="text-gray-600">{a.disciplinaNombre || 'General'}</td>
                <td className="text-gray-500">{a.fecha}</td>
                <td className="text-gray-500">{a.hora}</td>
              </tr>
            ))}
            {hoy.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400">Aun no hay asistencias registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {camaraAbierta && (
        <CamaraScanner
          titulo="Pasar lista con cámara"
          onCodigo={registrarPorQr}
          onClose={() => setCamaraAbierta(false)}
        />
      )}
    </div>
  );
}
