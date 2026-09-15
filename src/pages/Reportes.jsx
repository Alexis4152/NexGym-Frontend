import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as cajaApi from '../api/caja';
import * as dashboardApi from '../api/dashboard';

export default function Reportes() {
  const [dashboard, setDashboard] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    dashboardApi.getDashboard().then(({ data }) => setDashboard(data.data));
    cajaApi.listMovimientos(undefined, undefined, 0, 200).then(({ data }) => setMovimientos(data.data.content));
  }, []);

  const porCategoria = useMemo(() => {
    const map = new Map();
    movimientos.forEach((m) => {
      const key = m.categoriaNombre;
      const cur = map.get(key) || { categoria: key, ingreso: 0, egreso: 0 };
      cur[m.tipo === 'INGRESO' ? 'ingreso' : 'egreso'] += Number(m.monto);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.ingreso + b.egreso - (a.ingreso + a.egreso)).slice(0, 8);
  }, [movimientos]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Reportes</h1>

      {dashboard && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-xs text-gray-500">Ingresos del mes</p>
            <p className="text-xl font-bold text-emerald-600">${Number(dashboard.ingresosMes).toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">Egresos del mes</p>
            <p className="text-xl font-bold text-red-600">${Number(dashboard.egresosMes).toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">Balance del mes</p>
            <p className={'text-xl font-bold ' + (dashboard.balanceMes >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              ${Number(dashboard.balanceMes).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Ingresos vs. egresos por categoria (recientes)</h2>
        {porCategoria.length === 0 ? (
          <p className="text-sm text-gray-400">Aun no hay movimientos suficientes para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={porCategoria}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Bar dataKey="ingreso" fill="#1c6690" name="Ingreso" />
              <Bar dataKey="egreso" fill="#dc2626" name="Egreso" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
