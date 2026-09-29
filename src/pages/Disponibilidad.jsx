import { useEffect, useMemo, useState } from 'react';
import * as clasesApi from '../api/clases';

const DIA_LABEL = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miercoles', JUEVES: 'Jueves',
  VIERNES: 'Viernes', SABADO: 'Sabado', DOMINGO: 'Domingo',
};

export default function Disponibilidad() {
  const [clases, setClases] = useState([]);
  const [sucursal, setSucursal] = useState('');

  useEffect(() => {
    clasesApi.getDisponibilidadClases().then(({ data }) => setClases(data.data));
  }, []);

  const sucursalesDisponibles = useMemo(
    () => [...new Set(clases.map((c) => c.sucursalNombre))].sort(),
    [clases]
  );
  const filtradas = sucursal ? clases.filter((c) => c.sucursalNombre === sucursal) : clases;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Disponibilidad de clases</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cupo de todas las sucursales del centro, para cuando la tuya este llena y quieras
          decirle al cliente donde mas hay lugar. No incluye instructor ni lista de alumnos.
        </p>
      </div>

      {sucursalesDisponibles.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (!sucursal ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
            onClick={() => setSucursal('')}
          >
            Todas
          </button>
          {sucursalesDisponibles.map((s) => (
            <button
              type="button"
              key={s}
              className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (sucursal === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
              onClick={() => setSucursal(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Sucursal</th>
              <th>Disciplina</th>
              <th>Dia</th>
              <th>Horario</th>
              <th>Cupo</th>
              <th>Disponible</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{c.sucursalNombre}</td>
                <td className="text-gray-600">{c.disciplinaNombre}</td>
                <td className="text-gray-600">{DIA_LABEL[c.diaSemana] || c.diaSemana}</td>
                <td className="text-gray-500">{c.horaInicio.slice(0, 5)}–{c.horaFin.slice(0, 5)}</td>
                <td className="text-gray-500">{c.reservados} / {c.capacidadMaxima}</td>
                <td>
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (c.cupoDisponible > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                    {c.cupoDisponible > 0 ? `${c.cupoDisponible} lugares` : 'Lleno'}
                  </span>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">Sin clases activas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
