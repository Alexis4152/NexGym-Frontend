import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../api/dashboard';
import { useAuth } from '../context/AuthContext.jsx';

function money(n) {
  return (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { hasSection, hasPermiso } = useAuth();

  useEffect(() => {
    dashboardApi.getDashboard().then(({ data }) => setData(data.data));
  }, []);

  if (!data) return <p className="text-gray-400">Cargando panel...</p>;

  // Accesos rapidos homologados con el patron de DemoPV (tarjetas grandes con emoji +
  // titulo + subtitulo), solo se muestran los que el usuario realmente puede usar.
  const accesos = [
    hasSection('ALUMNOS') && hasPermiso('ALUMNOS_CREAR') &&
      { to: '/alumnos', icon: '🧑', label: 'Nuevo alumno', sub: 'Registrar un alumno' },
    hasSection('MEMBRESIAS') && hasPermiso('MEMBRESIAS_CREAR') &&
      { to: '/membresias', icon: '🎫', label: 'Nueva membresia', sub: 'Asignar un plan' },
    hasSection('TIENDA') && hasPermiso('VENTAS_CREAR') &&
      { to: '/punto-venta', icon: '🛒', label: 'Nueva venta', sub: 'Ir al punto de venta' },
    hasSection('INVENTARIO') &&
      { to: '/inventario', icon: '📦', label: 'Inventario', sub: 'Gestionar articulos' },
    hasSection('CAJA') &&
      { to: '/caja', icon: '💰', label: 'Caja', sub: 'Movimientos e ingresos' },
    hasSection('REPORTES') &&
      { to: '/reportes', icon: '📈', label: 'Reportes', sub: 'Ver estadisticas' },
  ].filter(Boolean);

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

      {accesos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {accesos.map((a) => (
            <Link key={a.to} to={a.to} className="card hover:shadow-md transition-shadow flex items-center gap-4">
              <span className="text-3xl">{a.icon}</span>
              <div>
                <p className="font-semibold text-gray-900">{a.label}</p>
                <p className="text-sm text-gray-500">{a.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

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
