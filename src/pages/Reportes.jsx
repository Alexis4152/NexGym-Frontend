import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import * as reportesApi from '../api/reportes';
import * as sucursalesApi from '../api/sucursales';
import { useNotify } from '../context/NotifyContext.jsx';

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => (n == null ? '—' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(Number(n)).toFixed(1)}%`);

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function presetRango(preset) {
  const hoy = new Date();
  const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (preset) {
    case 'hoy':
      return [inicioDia(hoy), inicioDia(hoy)];
    case 'semana': {
      const dia = hoy.getDay() === 0 ? 7 : hoy.getDay();
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - dia + 1);
      return [inicioDia(inicio), inicioDia(hoy)];
    }
    case 'mes':
      return [new Date(hoy.getFullYear(), hoy.getMonth(), 1), inicioDia(hoy)];
    case 'mesAnterior': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return [inicio, fin];
    }
    case '3meses':
      return [new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1), inicioDia(hoy)];
    case '6meses':
      return [new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1), inicioDia(hoy)];
    case 'anio':
      return [new Date(hoy.getFullYear(), 0, 1), inicioDia(hoy)];
    default:
      return [new Date(hoy.getFullYear(), hoy.getMonth(), 1), inicioDia(hoy)];
  }
}

const PRESETS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mesAnterior', label: 'Mes anterior' },
  { value: '3meses', label: 'Últimos 3 meses' },
  { value: '6meses', label: 'Últimos 6 meses' },
  { value: 'anio', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
];

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'tienda', label: 'Tienda' },
  { id: 'membresias', label: 'Membresías' },
  { id: 'alumnos', label: 'Alumnos' },
  { id: 'operacion', label: 'Operación' },
];

function Card({ label, value, sub, onClick, tone }) {
  return (
    <div className={'card ' + (onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '')} onClick={onClick}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={'text-xl font-bold mt-1 ' + (tone || 'text-gray-800')}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Tabla({ headers, rows, empty }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">{empty || 'Sin datos'}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-100">
          {headers.map((h) => <th key={h} className="py-2">{h}</th>)}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

export default function Reportes() {
  const { notify } = useNotify();
  const [preset, setPreset] = useState('mes');
  const [rango, setRango] = useState(() => presetRango('mes'));
  const [tab, setTab] = useState('resumen');
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const from = toISO(rango[0]);
  const to = toISO(rango[1]);

  function cambiarPreset(p) {
    setPreset(p);
    if (p !== 'personalizado') setRango(presetRango(p));
  }

  async function handleDescargarPdf() {
    setGenerandoPdf(true);
    try {
      const { data } = await reportesApi.descargarPdf(from, to);
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch {
      notify('No se pudo generar el PDF', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Reportes</h1>
        <button className="btn-primary text-sm" onClick={handleDescargarPdf} disabled={generandoPdf}>
          📄 {generandoPdf ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Periodo</label>
          <select className="input" value={preset} onChange={(e) => cambiarPreset(e.target.value)}>
            {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {preset === 'personalizado' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
              <input type="date" className="input" value={from} onChange={(e) => setRango([new Date(e.target.value), rango[1]])} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
              <input type="date" className="input" value={to} onChange={(e) => setRango([rango[0], new Date(e.target.value)])} />
            </div>
          </>
        )}
        <p className="text-xs text-gray-400 pb-2">{from} — {to}</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} className={'pb-2 whitespace-nowrap ' + (tab === t.id ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
                  onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <TabResumen from={from} to={to} irA={setTab} />}
      {tab === 'finanzas' && <TabFinanzas from={from} to={to} />}
      {tab === 'tienda' && <TabTienda from={from} to={to} />}
      {tab === 'membresias' && <TabMembresias from={from} to={to} />}
      {tab === 'alumnos' && <TabAlumnos from={from} to={to} />}
      {tab === 'operacion' && <TabOperacion from={from} to={to} />}
    </div>
  );
}

// ---------------- Resumen ----------------
function TabResumen({ from, to, irA }) {
  const [fin, setFin] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [alumnos, setAlumnos] = useState(null);
  const [cartera, setCartera] = useState(null);
  const [finComp, setFinComp] = useState(null);

  useEffect(() => {
    reportesApi.finanzasResumen(from, to).then(({ data }) => setFin(data.data));
    reportesApi.finanzasResumenComparativo(from, to).then(({ data }) => setFinComp(data.data));
    reportesApi.tiendaResumen(from, to).then(({ data }) => setTienda(data.data));
    reportesApi.alumnosResumen(from, to).then(({ data }) => setAlumnos(data.data));
    reportesApi.cartera().then(({ data }) => setCartera(data.data));
  }, [from, to]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card label="Ingresos" value={fin ? fmt(fin.ingresos) : '...'} sub={finComp ? pct(finComp.cambioPorcentual) + ' vs. periodo anterior' : null}
            tone="text-emerald-600" onClick={() => irA('finanzas')} />
      <Card label="Ventas Tienda" value={tienda ? fmt(tienda.totalVentas) : '...'} sub={tienda ? `${tienda.numeroVentas} ventas` : null} onClick={() => irA('tienda')} />
      <Card label="Alumnos activos" value={alumnos ? alumnos.activos : '...'} sub={alumnos ? `+${alumnos.nuevos} nuevos en el periodo` : null} onClick={() => irA('alumnos')} />
      <Card label="Por cobrar" value={cartera ? fmt(cartera.totalPorCobrar) : '...'} sub={cartera ? `${cartera.alumnosConSaldo} alumnos` : null}
            tone="text-red-600" onClick={() => irA('finanzas')} />
    </div>
  );
}

// ---------------- Finanzas ----------------
function TabFinanzas({ from, to }) {
  const [fin, setFin] = useState(null);
  const [metodos, setMetodos] = useState(null);
  const [cart, setCart] = useState(null);

  useEffect(() => {
    reportesApi.finanzasResumen(from, to).then(({ data }) => setFin(data.data));
    reportesApi.finanzasMetodosPago(from, to).then(({ data }) => setMetodos(data.data));
    reportesApi.cartera().then(({ data }) => setCart(data.data));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card label="Ingresos" value={fin ? fmt(fin.ingresos) : '...'} tone="text-emerald-600" />
        <Card label="Egresos" value={fin ? fmt(fin.egresos) : '...'} tone="text-red-600" />
        <Card label="Resultado" value={fin ? fmt(fin.resultado) : '...'} tone={fin && fin.resultado < 0 ? 'text-red-600' : 'text-emerald-600'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Ingresos por concepto</h3>
          <Tabla headers={['Concepto', 'Cant.', 'Total']} rows={fin?.ingresosPorConcepto.map((r) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{r.etiqueta}</td>
              <td className="text-gray-500">{r.cantidad}</td>
              <td className="font-semibold text-emerald-700">{fmt(r.total)}</td>
            </tr>
          ))} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Egresos por concepto</h3>
          <Tabla headers={['Concepto', 'Cant.', 'Total']} rows={fin?.egresosPorConcepto.map((r) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{r.etiqueta}</td>
              <td className="text-gray-500">{r.cantidad}</td>
              <td className="font-semibold text-red-700">{fmt(r.total)}</td>
            </tr>
          ))} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Métodos de pago — Tienda</h3>
          <Tabla headers={['Método', 'Ventas', 'Total']} rows={metodos?.tienda.map((r) => (
            <tr key={r.etiqueta} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{r.etiqueta}</td>
              <td className="text-gray-500">{r.cantidad}</td>
              <td className="font-semibold text-gray-800">{fmt(r.total)}</td>
            </tr>
          ))} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Métodos de pago — Membresías</h3>
          <Tabla headers={['Método', 'Pagos', 'Total']} rows={metodos?.membresias.map((r) => (
            <tr key={r.etiqueta} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{r.etiqueta}</td>
              <td className="text-gray-500">{r.cantidad}</td>
              <td className="font-semibold text-gray-800">{fmt(r.total)}</td>
            </tr>
          ))} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800">Cartera (saldos pendientes a hoy)</h3>
          {cart && (
            <p className="text-sm text-gray-600">
              Por cobrar: <strong className="text-red-600">{fmt(cart.totalPorCobrar)}</strong> · {cart.alumnosConSaldo} alumnos · {cart.membresiasConSaldo} membresías
            </p>
          )}
        </div>
        <Tabla headers={['Alumno', 'Plan', 'Total', 'Pagado', 'Saldo', 'Vence', 'Estado']} rows={cart?.detalle.map((c) => (
          <tr key={c.membresiaId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{c.alumnoNombre}</td>
            <td className="text-gray-600">{c.planNombre}</td>
            <td className="text-gray-600">{fmt(c.totalContratado)}</td>
            <td className="text-gray-600">{fmt(c.totalPagado)}</td>
            <td className="font-semibold text-red-600">{fmt(c.saldo)}</td>
            <td className="text-gray-500">{c.fechaFin || '-'}</td>
            <td className="text-gray-500">{c.estado}</td>
          </tr>
        ))} empty="Sin saldos pendientes" />
      </div>
    </div>
  );
}

// ---------------- Tienda ----------------
function TabTienda({ from, to }) {
  const [resumen, setResumen] = useState(null);
  const [porDia, setPorDia] = useState([]);
  const [productos, setProductos] = useState([]);
  const [margen, setMargen] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    reportesApi.tiendaResumen(from, to).then(({ data }) => setResumen(data.data));
    reportesApi.tiendaPorDia(from, to).then(({ data }) => setPorDia(data.data.map((d) => ({ fecha: d.fecha.slice(5), total: Number(d.total) }))));
    reportesApi.tiendaProductos(from, to, 8).then(({ data }) => setProductos(data.data));
    reportesApi.tiendaProductosMargen(from, to, 8).then(({ data }) => setMargen(data.data));
    reportesApi.tiendaCategorias(from, to).then(({ data }) => setCategorias(data.data));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Total vendido" value={resumen ? fmt(resumen.totalVentas) : '...'} tone="text-brand-700" />
        <Card label="N° de ventas" value={resumen ? resumen.numeroVentas : '...'} />
        <Card label="Ticket promedio" value={resumen ? fmt(resumen.ticketPromedio) : '...'} />
        <Card label="Productos vendidos" value={resumen ? resumen.productosVendidos : '...'} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Ventas por día</h3>
        {porDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={porDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="total" stroke="#1c6690" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-gray-400 text-center py-8">Sin ventas en el periodo</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Productos más vendidos</h3>
          <Tabla headers={['Producto', 'Cantidad', 'Total']} rows={productos.map((p) => (
            <tr key={p.articuloId} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{p.nombre}</td>
              <td className="text-gray-500">{p.cantidadVendida}</td>
              <td className="font-semibold text-gray-800">{fmt(p.totalVendido)}</td>
            </tr>
          ))} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-1">Rentabilidad por producto</h3>
          <p className="text-xs text-gray-400 mb-3">Usa el costo actual del artículo (no se conserva costo histórico por venta).</p>
          <Tabla headers={['Producto', 'Margen']} rows={margen.map((p) => (
            <tr key={p.articuloId} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{p.nombre}</td>
              <td className="font-semibold text-emerald-600">{fmt(p.margenEstimado)}</td>
            </tr>
          ))} />
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Ventas por categoría</h3>
        <Tabla headers={['Categoría', 'Cantidad', 'Total']} rows={categorias.map((c) => (
          <tr key={c.id || c.etiqueta} className="border-b border-gray-50">
            <td className="py-2 text-gray-700">{c.etiqueta}</td>
            <td className="text-gray-500">{c.cantidad}</td>
            <td className="font-semibold text-gray-800">{fmt(c.total)}</td>
          </tr>
        ))} />
      </div>
    </div>
  );
}

// ---------------- Membresias ----------------
const VENC_TABS = [
  { id: 'venceHoy', label: 'Vencen hoy' },
  { id: 'proximosAVencer', label: 'Próximos a vencer' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'vencidosSinRenovar', label: 'Vencidos sin renovar' },
];

function TabMembresias({ from, to }) {
  const [ventas, setVentas] = useState(null);
  const [venc, setVenc] = useState(null);
  const [ren, setRen] = useState(null);
  const [vencTab, setVencTab] = useState('proximosAVencer');

  useEffect(() => {
    reportesApi.membresiasVentas(from, to).then(({ data }) => setVentas(data.data));
    reportesApi.membresiasRenovaciones(from, to).then(({ data }) => setRen(data.data));
  }, [from, to]);

  useEffect(() => {
    reportesApi.membresiasVencimientos(7).then(({ data }) => setVenc(data.data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card label="Nuevas membresías" value={ventas ? ventas.nuevasMembresias : '...'} />
        <Card label="Total contratado" value={ventas ? fmt(ventas.totalContratado) : '...'} tone="text-brand-700" />
        <Card label="Total cobrado en el periodo" value={ventas ? fmt(ventas.totalCobrado) : '...'} tone="text-emerald-600" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Nuevas por plan</h3>
        <Tabla headers={['Plan', 'Cantidad', 'Total']} rows={ventas?.porPlan.map((p) => (
          <tr key={p.id} className="border-b border-gray-50">
            <td className="py-2 text-gray-700">{p.etiqueta}</td>
            <td className="text-gray-500">{p.cantidad}</td>
            <td className="font-semibold text-gray-800">{fmt(p.total)}</td>
          </tr>
        ))} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Vencimientos (horizonte 7 días)</h3>
        <div className="flex gap-3 border-b border-gray-100 mb-3 text-xs overflow-x-auto">
          {VENC_TABS.map((t) => (
            <button key={t.id} className={'pb-2 whitespace-nowrap ' + (vencTab === t.id ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
                    onClick={() => setVencTab(t.id)}>
              {t.label} {venc ? `(${venc[t.id]?.length ?? 0})` : ''}
            </button>
          ))}
        </div>
        <Tabla headers={['Alumno', 'Plan', 'Disciplinas', 'Vence', 'Saldo', 'Última asistencia']} rows={venc?.[vencTab]?.map((v) => (
          <tr key={v.membresiaId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{v.alumnoNombre}</td>
            <td className="text-gray-600">{v.planNombre}</td>
            <td className="text-gray-500 text-xs">{v.disciplinas || '-'}</td>
            <td className="text-gray-600">{v.fechaFin}</td>
            <td className={v.saldo > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}>{fmt(v.saldo)}</td>
            <td className="text-gray-500">{v.ultimaAsistencia || 'Nunca'}</td>
          </tr>
        ))} empty="Sin membresías en este grupo" />
      </div>

      {ren && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Renovaciones en el periodo</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4 text-center text-sm">
            {[['Total', ren.total], ['Mismo plan', ren.mismoPlan], ['Cambio de plan', ren.cambioPlan],
              ['Cambio disciplina', ren.cambioDisciplina], ['Anticipadas', ren.anticipadas], ['Tardías', ren.tardias]].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg py-2">
                <p className="text-lg font-bold text-gray-800">{v}</p>
                <p className="text-xs text-gray-500">{l}</p>
              </div>
            ))}
          </div>
          <Tabla headers={['Alumno', 'Plan anterior', 'Plan nuevo', 'Inicio', 'Tipo']} rows={ren.detalle.map((r) => (
            <tr key={r.membresiaId} className="border-b border-gray-50">
              <td className="py-2 text-gray-800">{r.alumnoNombre}</td>
              <td className="text-gray-600">{r.planAnteriorNombre}</td>
              <td className="text-gray-600">{r.planNuevoNombre}</td>
              <td className="text-gray-500">{r.fechaInicio}</td>
              <td className="text-xs text-gray-500">{r.anticipada ? 'Anticipada' : 'Tardía'}{r.cambioDisciplina ? ' · cambió disciplina' : ''}</td>
            </tr>
          ))} />
        </div>
      )}
    </div>
  );
}

// ---------------- Alumnos ----------------
function TabAlumnos({ from, to }) {
  const [resumen, setResumen] = useState(null);
  const [retencion, setRetencion] = useState(null);
  const [riesgo, setRiesgo] = useState([]);

  useEffect(() => {
    reportesApi.alumnosResumen(from, to).then(({ data }) => setResumen(data.data));
    reportesApi.alumnosRetencion(from, to).then(({ data }) => setRetencion(data.data));
    reportesApi.alumnosRiesgoAbandono().then(({ data }) => setRiesgo(data.data));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card label="Activos" value={resumen ? resumen.activos : '...'} />
        <Card label="Nuevos en el periodo" value={resumen ? resumen.nuevos : '...'} tone="text-emerald-600" />
        <Card label="Bajas en el periodo" value={resumen ? resumen.bajas : '...'} tone="text-red-600" />
      </div>

      {resumen && resumen.nuevosPorMes.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Nuevos alumnos por mes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={resumen.nuevosPorMes.map((p) => ({ mes: p.fecha.slice(0, 7), cantidad: p.cantidad }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#1c6690" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {retencion && (
        <div className="card">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">Retención</h3>
            <p className="text-2xl font-bold text-brand-700">{Number(retencion.porcentaje).toFixed(1)}%</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {retencion.retenidos} de {retencion.elegibles} membresías que vencieron en el periodo fueron renovadas
            (cualquier plan/disciplina) dentro de los {retencion.ventanaGraciaDias} días siguientes a su vencimiento.
          </p>
          <Tabla headers={['Alumno', 'Plan anterior', 'Venció', 'Renovó', 'Nueva membresía']} rows={retencion.detalle.map((r, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-2 text-gray-800">{r.alumnoNombre}</td>
              <td className="text-gray-600">{r.planAnteriorNombre}</td>
              <td className="text-gray-500">{r.fechaFinAnterior}</td>
              <td>{r.renovo ? <span className="text-emerald-600">Sí</span> : <span className="text-red-600">No</span>}</td>
              <td className="text-gray-500">{r.fechaNuevaMembresia || '-'}</td>
            </tr>
          ))} />
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-1">Alumnos en riesgo de abandono</h3>
        <p className="text-xs text-gray-400 mb-3">Membresía activa sin asistencia reciente (umbral configurable por centro).</p>
        <Tabla headers={['Alumno', 'Plan', 'Disciplinas', 'Última asistencia', 'Días sin asistir', 'Vence']} rows={riesgo.map((r) => (
          <tr key={r.alumnoId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{r.alumnoNombre}</td>
            <td className="text-gray-600">{r.planNombre}</td>
            <td className="text-gray-500 text-xs">{r.disciplinas || '-'}</td>
            <td className="text-gray-500">{r.ultimaAsistencia || 'Nunca'}</td>
            <td className="font-semibold text-red-600">{r.diasSinAsistir}</td>
            <td className="text-gray-500">{r.fechaFin || '-'}</td>
          </tr>
        ))} empty="Sin alumnos en riesgo" />
      </div>
    </div>
  );
}

// ---------------- Operacion ----------------
function TabOperacion({ from, to }) {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [asistencias, setAsistencias] = useState(null);
  const [ocupacion, setOcupacion] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);

  useEffect(() => {
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
  }, []);

  useEffect(() => {
    reportesApi.operacionAsistencias(from, to).then(({ data }) => setAsistencias(data.data));
    reportesApi.operacionInstructores(from, to).then(({ data }) => setInstructores(data.data));
    reportesApi.operacionDisciplinas(from, to).then(({ data }) => setDisciplinas(data.data));
  }, [from, to]);

  useEffect(() => {
    reportesApi.operacionOcupacionClases(from, to, sucursalId || undefined).then(({ data }) => setOcupacion(data.data));
  }, [from, to, sucursalId]);

  const unicaSucursal = sucursales.length === 1 ? sucursales[0] : null;

  return (
    <div className="space-y-6">
      {sucursales.length > 1 && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sucursal (solo aplica a Ocupación de clases)</label>
          <select className="input max-w-xs" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      )}

      {asistencias && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card label="Total asistencias" value={asistencias.total} />
            <Card label="Alumnos únicos" value={asistencias.alumnosUnicos} />
            <Card label="Promedio por alumno" value={Number(asistencias.promedioPorAlumno).toFixed(1)} />
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Asistencias por día</h3>
            {asistencias.porDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={asistencias.porDia.map((p) => ({ fecha: p.fecha.slice(5), cantidad: p.cantidad }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cantidad" stroke="#1c6690" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">Sin asistencias en el periodo</p>}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Por disciplina</h3>
              <Tabla headers={['Disciplina', 'Asistencias']} rows={asistencias.porDisciplina.map((d) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{d.etiqueta}</td>
                  <td className="text-gray-600">{d.cantidad}</td>
                </tr>
              ))} />
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-1">Por sucursal</h3>
              <p className="text-xs text-gray-400 mb-3">Solo cuenta asistencias ligadas a una clase con sucursal asignada.</p>
              <Tabla headers={['Sucursal', 'Asistencias']} rows={asistencias.porSucursal.map((d) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{d.etiqueta}</td>
                  <td className="text-gray-600">{d.cantidad}</td>
                </tr>
              ))} />
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Ocupación de clases</h3>
        <Tabla headers={['Clase', 'Instructor', 'Sucursal', 'Cupo', 'Reservados', 'Asistieron', '% Ocupación']} rows={ocupacion.map((o) => (
          <tr key={o.claseId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{o.disciplinaNombre} · {o.horario}</td>
            <td className="text-gray-600">{o.instructorNombre || '-'}</td>
            <td className="text-gray-600">{o.sucursalNombre}</td>
            <td className="text-gray-500">{o.cupo}</td>
            <td className="text-gray-500">{o.reservados}</td>
            <td className="text-gray-500">{o.asistieron}</td>
            <td className="font-semibold text-brand-700">{Number(o.porcentajeOcupacion).toFixed(1)}%</td>
          </tr>
        ))} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-1">Instructores</h3>
        <p className="text-xs text-gray-400 mb-3">Indicadores objetivos de actividad, sin calificación.</p>
        <Tabla headers={['Instructor', 'Clases impartidas', 'Asistencias acumuladas', 'Prom. alumnos/clase', 'Ocupación promedio']} rows={instructores.map((i) => (
          <tr key={i.instructorId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{i.nombre}</td>
            <td className="text-gray-600">{i.clasesImpartidas}</td>
            <td className="text-gray-600">{i.asistenciasAcumuladas}</td>
            <td className="text-gray-500">{Number(i.promedioAlumnosPorClase).toFixed(1)}</td>
            <td className="text-gray-500">{Number(i.ocupacionPromedio).toFixed(1)}%</td>
          </tr>
        ))} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-1">Disciplinas</h3>
        <p className="text-xs text-gray-400 mb-3">"Ingresos asociados" NO es ingreso exclusivo: suma el precio completo de cada membresía que incluye la disciplina (una membresía multidisciplina cuenta en cada una).</p>
        <Tabla headers={['Disciplina', 'Alumnos activos', 'Membresías', 'Asistencias', 'Clases impartidas', 'Ingresos asociados']} rows={disciplinas.map((d) => (
          <tr key={d.disciplinaId} className="border-b border-gray-50">
            <td className="py-2 text-gray-800">{d.nombre}</td>
            <td className="text-gray-600">{d.alumnosActivos}</td>
            <td className="text-gray-600">{d.membresiasRelacionadas}</td>
            <td className="text-gray-600">{d.asistencias}</td>
            <td className="text-gray-600">{d.clasesImpartidas}</td>
            <td className="text-gray-500">{fmt(d.ingresosAsociadosNoExclusivos)}</td>
          </tr>
        ))} />
      </div>
    </div>
  );
}
