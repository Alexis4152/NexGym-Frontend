import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as apartadosPlanApi from '../api/apartadosPlan';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from './Modal.jsx';
import Pagination from './Pagination.jsx';
import ConvertirApartadoPlanModal from './ConvertirApartadoPlanModal.jsx';

const ESTADOS_PLAN = ['PENDIENTE', 'CONVERTIDO', 'CANCELADO'];
const ESTADO_PLAN_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONVERTIDO: 'bg-emerald-100 text-emerald-700',
  CANCELADO: 'bg-gray-100 text-gray-600',
};
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// Apartados de planes de membresia hechos desde la tienda en linea. Vive en dos lugares:
// la pestana "Planes" de Apartados y la pestana "Apartados en línea" de Membresias -- por
// eso es un componente aparte. Ver la lista lo puede quien tenga Tienda o Membresias;
// convertir/cancelar solo quien tenga Membresias (mismo criterio que el backend).
export default function ApartadosPlanPanel({ estadoInicial = '', recargarToken, onCambio }) {
  const { hasSection, hasPermiso, isSuperAdmin } = useAuth();
  const puedeProcesar = isSuperAdmin || hasSection('MEMBRESIAS');
  const puedeConvertir = isSuperAdmin || (hasSection('MEMBRESIAS') && hasPermiso('MEMBRESIAS_CREAR'));
  const vacios = { estado: estadoInicial, desde: '', hasta: '', q: '' };
  const [filtros, setFiltros] = useState(vacios);
  const [pageData, setPageData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [modalConvertir, setModalConvertir] = useState(null);
  const { notify } = useNotify();
  const hayFiltros = filtros.estado !== estadoInicial || filtros.desde || filtros.hasta || filtros.q;

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, page, size, recargarToken]);

  function cargar() {
    apartadosPlanApi.listApartadosPlan(filtros, page, size).then(({ data }) => setPageData(data.data));
  }

  function actualizarFiltro(campo, valor) {
    setPage(0);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  function despuesDeCambio() {
    cargar();
    onCambio?.();
  }

  async function verDetalle(a) {
    const { data } = await apartadosPlanApi.getApartadoPlan(a.id);
    setModalDetalle(data.data);
  }

  async function handleCancelar(e) {
    e.preventDefault();
    try {
      await apartadosPlanApi.cancelarApartadoPlan(modalCancelar.id, { motivo: motivo || null });
      notify('Apartado cancelado', 'success');
      setModalCancelar(null);
      setMotivo('');
      despuesDeCambio();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_PLAN.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={filtros.desde} onChange={(e) => actualizarFiltro('desde', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={filtros.hasta} onChange={(e) => actualizarFiltro('hasta', e.target.value)} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Cliente o plan</label>
          <input className="input" placeholder="🔍 Buscar por nombre, telefono o plan..." value={filtros.q} onChange={(e) => actualizarFiltro('q', e.target.value)} />
        </div>
        {hayFiltros && (
          <button type="button" className="btn-secondary text-sm" onClick={() => { setPage(0); setFiltros(vacios); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Folio</th>
              <th>Cliente</th>
              <th>Plan</th>
              <th>Anticipo</th>
              <th>Solicitado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">#{a.id}</td>
                <td className="text-gray-600">
                  {a.clienteNombre}<br /><span className="text-xs text-gray-400">{a.clienteTelefono}</span>
                  {a.alumnoId && (
                    <Link to={`/alumnos/${a.alumnoId}`} className="block text-xs text-brand-600 hover:underline">→ {a.alumnoNombre}</Link>
                  )}
                </td>
                <td className="text-gray-600">{a.planNombre}</td>
                <td className="text-gray-600">{fmt(a.montoAnticipo)}</td>
                <td className="text-gray-500">{new Date(a.solicitadoEn).toLocaleString()}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_PLAN_COLOR[a.estado]}>{a.estado}</span></td>
                <td className="text-right space-x-2 whitespace-nowrap">
                  <button className="text-brand-600 hover:underline" onClick={() => verDetalle(a)}>Ver</button>
                  {a.estado === 'PENDIENTE' && puedeConvertir && (
                    <button className="text-emerald-600 hover:underline" onClick={() => setModalConvertir(a)}>Dar de alta</button>
                  )}
                  {a.estado === 'PENDIENTE' && puedeProcesar && (
                    <button className="text-red-600 hover:underline" onClick={() => setModalCancelar(a)}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-400">Sin apartados de plan</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page} totalPages={pageData.totalPages} onChange={setPage}
          size={size} onSizeChange={(s) => { setPage(0); setSize(s); }} totalElements={pageData.totalElements}
          pageSizes={[10, 20, 50]} countMode="total"
        />
      </div>

      {modalDetalle && (
        <Modal title={`Apartado de plan #${modalDetalle.id}`} onClose={() => setModalDetalle(null)}>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-3"><span>Cliente</span><span className="text-right">{modalDetalle.clienteNombre} · {modalDetalle.clienteTelefono}</span></div>
            <div className="flex justify-between gap-3"><span>Correo</span><span className="text-right break-all">{modalDetalle.clienteEmail}</span></div>
            <div className="flex justify-between"><span>Plan</span><span>{modalDetalle.planNombre}</span></div>
            <div className="flex justify-between"><span>Precio del plan</span><span>{fmt(modalDetalle.precioPlan)}</span></div>
            <div className="flex justify-between"><span>Anticipo pagado (tarjeta)</span><span>{fmt(modalDetalle.montoAnticipo)}</span></div>
            <div className="flex justify-between"><span>Estado</span><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_PLAN_COLOR[modalDetalle.estado]}>{modalDetalle.estado}</span></div>
            {modalDetalle.notas && <p className="italic text-gray-500">{modalDetalle.notas}</p>}
            {modalDetalle.alumnoId && (
              <div className="flex justify-between"><span>Alumno</span>
                <Link to={`/alumnos/${modalDetalle.alumnoId}`} className="text-brand-600 hover:underline">{modalDetalle.alumnoNombre}</Link>
              </div>
            )}
            {modalDetalle.canceladoEn && (
              <div className="flex justify-between gap-3"><span>Cancelado por</span><span className="text-right">{modalDetalle.canceladoPorNombre} · {new Date(modalDetalle.canceladoEn).toLocaleString()}</span></div>
            )}
            {modalDetalle.motivoCancelacion && <p className="italic text-gray-500">Motivo: {modalDetalle.motivoCancelacion}</p>}
            {modalDetalle.convertidoEn && (
              <div className="flex justify-between gap-3"><span>Alta por</span><span className="text-right">{modalDetalle.convertidoPorNombre} · {new Date(modalDetalle.convertidoEn).toLocaleString()}</span></div>
            )}
          </div>
          {modalDetalle.estado === 'PENDIENTE' && puedeConvertir && (
            <button type="button" className="btn-primary w-full mt-4" onClick={() => { const a = modalDetalle; setModalDetalle(null); setModalConvertir(a); }}>
              Dar de alta membresía
            </button>
          )}
        </Modal>
      )}

      {modalCancelar && (
        <Modal title={`Cancelar apartado de plan #${modalCancelar.id}`} onClose={() => setModalCancelar(null)}>
          <form onSubmit={handleCancelar} className="space-y-3">
            <p className="text-sm text-gray-600">
              El anticipo de <strong>{fmt(modalCancelar.montoAnticipo)}</strong> quedara anulado en Caja. El reembolso al cliente se maneja fuera del sistema.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <button className="btn-danger w-full mt-2">Cancelar apartado</button>
          </form>
        </Modal>
      )}

      {modalConvertir && (
        <ConvertirApartadoPlanModal
          apartado={modalConvertir}
          onClose={() => setModalConvertir(null)}
          onConvertido={() => { setModalConvertir(null); despuesDeCambio(); }}
        />
      )}
    </>
  );
}
