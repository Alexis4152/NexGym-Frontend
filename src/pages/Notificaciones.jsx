import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as notificacionesApi from '../api/notificaciones';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Pagination from '../components/Pagination.jsx';

const TIPO_LABEL = {
  MEMBRESIA_NUEVA: 'Membresía nueva',
  MEMBRESIA_RENOVADA: 'Membresía renovada',
  MEMBRESIA_PROXIMA_VENCER: 'Membresía por vencer',
  MEMBRESIA_VENCE_HOY: 'Membresía vence hoy',
  MEMBRESIA_VENCIDA: 'Membresía vencida',
  PAGO_REGISTRADO: 'Pago registrado',
  ABONO_REGISTRADO: 'Abono registrado',
  PAGO_LIQUIDADO: 'Pago liquidado',
  RESERVA_CONFIRMADA: 'Reserva confirmada',
  RESERVA_CANCELADA: 'Reserva cancelada',
  CLASE_CANCELADA: 'Clase cancelada',
  CLASE_HORARIO_CAMBIADO: 'Cambio de horario',
  CLASE_INSTRUCTOR_CAMBIADO: 'Cambio de instructor',
  CLASE_RECORDATORIO: 'Recordatorio de clase',
  ADMIN_MEMBRESIAS_POR_VENCER: 'Resumen: membresías por vencer',
  ADMIN_ALUMNOS_SALDO_PENDIENTE: 'Resumen: saldo pendiente',
  ADMIN_CLASE_CUPO_LLENO: 'Clase con cupo lleno',
  ADMIN_CLASE_CUPO_DISPONIBLE: 'Se liberó un lugar',
  ADMIN_ALUMNO_RIESGO_ABANDONO: 'Riesgo de abandono',
  ADMIN_MEMBRESIA_NUEVA: 'Membresía nueva (registro)',
  ADMIN_MEMBRESIA_AGOTADA: 'Membresía agotada',
  ADMIN_MEMBRESIA_CANCELADA_O_VENCIDA: 'Membresía cancelada/vencida',
  ADMIN_PLAN_LLENO: 'Plan lleno',
  ADMIN_STOCK_BAJO: 'Stock bajo',
  ADMIN_STOCK_AGOTADO: 'Stock agotado',
  ADMIN_STOCK_RECUPERADO: 'Stock recuperado',
  ADMIN_PRODUCTO_NUEVO: 'Producto nuevo',
  ADMIN_CLASE_NUEVA: 'Clase nueva',
  ADMIN_DISCIPLINA_NUEVA: 'Disciplina nueva',
  ADMIN_ALUMNO_NUEVO: 'Alumno registrado',
  EGRESO_PENDIENTE_APROBACION: 'Egreso pendiente de aprobación',
  INSTRUCTOR_CLASE_ASIGNADA: 'Clase asignada',
  INSTRUCTOR_CLASE_CANCELADA: 'Clase cancelada',
  INSTRUCTOR_ALUMNO_INSCRITO: 'Alumno inscrito',
  INSTRUCTOR_ALUMNO_REMOVIDO: 'Alumno removido',
  INSTRUCTOR_DISCIPLINA_ASIGNADA: 'Disciplina asignada',
  INSTRUCTOR_SUCURSAL_CAMBIADA: 'Cambio de sucursal',
};

export default function Notificaciones() {
  const [tab, setTab] = useState('todas');
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [ejecutando, setEjecutando] = useState(null);
  const { notify } = useNotify();
  const { isSuperAdmin } = useAuth();

  function cargar() {
    notificacionesApi.listNotificaciones(tab === 'no-leidas', page, 20)
      .then(({ data }) => setPageData(data.data));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  async function handleLeer(n) {
    if (n.leida) return;
    await notificacionesApi.marcarLeida(n.id);
    setPageData((pd) => ({ ...pd, content: pd.content.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) }));
  }

  async function handleLeerTodas() {
    await notificacionesApi.marcarTodasLeidas();
    notify('Notificaciones marcadas como leídas', 'success');
    cargar();
  }

  async function handleEjecutar(tipo) {
    setEjecutando(tipo);
    try {
      if (tipo === 'membresias') await notificacionesApi.ejecutarSchedulerMembresias();
      else await notificacionesApi.ejecutarSchedulerRecordatorios();
      notify('Job ejecutado', 'success');
      setPage(0);
      cargar();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo ejecutar el job', 'error');
    } finally {
      setEjecutando(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Notificaciones</h1>
        <button className="btn-secondary" onClick={handleLeerTodas}>Marcar todas como leídas</button>
      </div>

      {isSuperAdmin && (
        <div className="card mb-4 bg-amber-50 border border-amber-200">
          <p className="text-xs font-medium text-amber-800 mb-2">
            Panel de pruebas (solo SUPER_ADMIN): dispara los jobs programados sin esperar al cron.
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" disabled={ejecutando === 'membresias'} onClick={() => handleEjecutar('membresias')}>
              {ejecutando === 'membresias' ? 'Ejecutando...' : 'Ejecutar revisión de membresías'}
            </button>
            <button className="btn-secondary text-xs" disabled={ejecutando === 'clases'} onClick={() => handleEjecutar('clases')}>
              {ejecutando === 'clases' ? 'Ejecutando...' : 'Ejecutar recordatorios de clase'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <button
          className={'pb-2 ' + (tab === 'todas' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
          onClick={() => { setTab('todas'); setPage(0); }}
        >
          Todas
        </button>
        <button
          className={'pb-2 ' + (tab === 'no-leidas' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
          onClick={() => { setTab('no-leidas'); setPage(0); }}
        >
          No leídas
        </button>
      </div>

      <div className="card divide-y divide-gray-50">
        {pageData.content.map((n) => (
          <div key={n.id} className={'py-3 flex items-start justify-between gap-4 ' + (!n.leida ? 'bg-brand-50/30 -mx-4 px-4' : '')}>
            <div className="flex items-start gap-2">
              {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />}
              <div className={n.leida ? 'ml-3.5' : ''}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{TIPO_LABEL[n.tipo] || n.tipo}</span>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('es-MX')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mt-1">{n.titulo}</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{n.mensaje}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {n.alumnoId && (
                <Link to={`/alumnos/${n.alumnoId}`} className="text-xs text-brand-600 hover:underline">Ver alumno</Link>
              )}
              {!n.leida && (
                <button className="text-xs text-gray-500 hover:underline" onClick={() => handleLeer(n)}>Marcar leída</button>
              )}
            </div>
          </div>
        ))}
        {pageData.content.length === 0 && (
          <p className="py-8 text-center text-gray-400 text-sm">Sin notificaciones</p>
        )}
      </div>
      <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
    </div>
  );
}
