import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as alumnosApi from '../api/alumnos';
import * as membresiasApi from '../api/membresias';

const ESTADO_COLOR = { ACTIVA: 'bg-emerald-100 text-emerald-700', VENCIDA: 'bg-red-100 text-red-700', CANCELADA: 'bg-gray-100 text-gray-600' };

export default function AlumnoDetalle() {
  const { id } = useParams();
  const [alumno, setAlumno] = useState(null);
  const [membresias, setMembresias] = useState([]);

  useEffect(() => {
    alumnosApi.getAlumno(id).then(({ data }) => setAlumno(data.data));
    membresiasApi.listMembresiasPorAlumno(id, 0, 50).then(({ data }) => setMembresias(data.data.content));
  }, [id]);

  if (!alumno) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div>
      <Link to="/alumnos" className="text-sm text-brand-600 hover:underline">
        ← Volver a alumnos
      </Link>

      <div className="card mt-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">{alumno.nombre}</h1>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 mt-3">
          <p>Telefono: {alumno.telefono || '-'}</p>
          <p>Correo: {alumno.email || '-'}</p>
          <p>Contacto de emergencia: {alumno.contactoEmergenciaNombre || '-'} {alumno.contactoEmergenciaTelefono ? `(${alumno.contactoEmergenciaTelefono})` : ''}</p>
          <p>Ingreso: {alumno.fechaIngreso}</p>
          <p>Disciplinas: {alumno.disciplinaNombres?.join(', ') || '-'}</p>
        </div>
        {alumno.observaciones && <p className="text-sm text-gray-500 mt-3 italic">{alumno.observaciones}</p>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Historial de membresias</h2>
          <Link to="/membresias" className="text-xs text-brand-600 hover:underline">
            Registrar nueva membresia
          </Link>
        </div>
        {membresias.length === 0 ? (
          <p className="text-sm text-gray-400">Este alumno aun no tiene membresias registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Plan</th>
                <th>Vigencia</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {membresias.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{m.planNombre}</td>
                  <td className="text-gray-600">{m.fechaInicio} — {m.fechaFin}</td>
                  <td className="text-gray-600">${Number(m.precioFinal).toFixed(2)}</td>
                  <td>
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[m.estado]}>{m.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
