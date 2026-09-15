import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../api/dashboard';

function money(n) {
  return (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    dashboardApi.getDashboard().then(({ data }) => setData(data.data));
  }, []);

  if (!data) return <p className="text-gray-400">Cargando panel...</p>;

  const cards = [
    { label: 'Ingresos del mes', value: money(data.ingresosMes), tone: 'text-emerald-600' },
    { label: 'Egresos del mes', value: money(data.egresosMes), tone: 'text-red-600' },
    { label: 'Balance del mes', value: money(data.balanceMes), tone: data.balanceMes >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Alumnos activos', value: data.alumnosActivos, tone: 'text-gray-800' },
    { label: 'Membresias vencidas', value: data.membresiasVencidas, tone: 'text-red-600' },
    { label: 'Por vencer (7 dias)', value: data.membresiasPorVencer, tone: 'text-amber-600' },
    { label: 'Asistencias de hoy', value: data.asistenciasHoy, tone: 'text-gray-800' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Panel</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={'text-2xl font-bold ' + c.tone}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Membresias por vencer pronto</h2>
          {data.proximasAVencer.length === 0 ? (
            <p className="text-sm text-gray-400">No hay membresias por vencer en los proximos dias.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.proximasAVencer.map((m) => (
                <li key={m.id} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-700">{m.alumnoNombre}</span>
                  <span className={m.diasParaVencer <= 1 ? 'text-red-600 font-medium' : 'text-amber-600'}>
                    {m.diasParaVencer <= 0 ? 'Vence hoy' : `Vence en ${m.diasParaVencer} dia(s)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/membresias" className="text-xs text-brand-600 hover:underline mt-3 inline-block">
            Ver todas las membresias
          </Link>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Inventario con stock bajo</h2>
          {data.stockBajo.length === 0 ? (
            <p className="text-sm text-gray-400">Todo el inventario esta en niveles saludables.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.stockBajo.map((a) => (
                <li key={a.id} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-700">{a.nombre}</span>
                  <span className="text-red-600 font-medium">
                    {a.stock} / min {a.stockMinimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/inventario" className="text-xs text-brand-600 hover:underline mt-3 inline-block">
            Ver inventario
          </Link>
        </div>
      </div>
    </div>
  );
}
