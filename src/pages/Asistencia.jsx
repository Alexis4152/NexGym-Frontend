import { useEffect, useState } from 'react';
import * as asistenciasApi from '../api/asistencias';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';

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
  const { notify } = useNotify();

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

  async function registrar(alumno) {
    try {
      await asistenciasApi.registrarAsistencia({ alumnoId: alumno.id, disciplinaId: disciplinaId || null });
      notify(`Asistencia registrada: ${alumno.nombre}`, 'success');
      setQ('');
      setResultados([]);
      loadHoy();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la asistencia', 'error');
    }
  }

  async function handleKeyDown(e) {
    if (e.key !== 'Enter' || q.trim().length < LARGO_MINIMO_QR) return;
    try {
      const { data } = await alumnosApi.buscarAlumnoPorQr(q.trim());
      await registrar(data.data);
    } catch {
      notify('Ningun alumno tiene ese codigo QR', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Asistencia</h1>

      <div className="card max-w-lg mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina (opcional)</label>
        <select className="input mb-4" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
          <option value="">General / acceso libre</option>
          {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar alumno para pasar lista (o escanea su QR)</label>
        <input className="input" placeholder="Nombre del alumno o escanea su QR..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={handleKeyDown} autoFocus />

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
    </div>
  );
}
