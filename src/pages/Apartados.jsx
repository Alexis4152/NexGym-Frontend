import { useEffect, useState } from 'react';
import * as apartadosApi from '../api/apartados';
import * as apartadosPlanApi from '../api/apartadosPlan';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { printVentaTicket } from '../utils/printer';

const ESTADOS = ['PENDIENTE', 'ACTIVO', 'COMPLETADO', 'CANCELADO', 'VENCIDO'];
const ESTADO_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  COMPLETADO: 'bg-blue-100 text-blue-700',
  CANCELADO: 'bg-gray-100 text-gray-600',
  VENCIDO: 'bg-red-100 text-red-700',
};

const ESTADOS_PLAN = ['PENDIENTE', 'CONVERTIDO', 'CANCELADO'];
const ESTADO_PLAN_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONVERTIDO: 'bg-emerald-100 text-emerald-700',
  CANCELADO: 'bg-gray-100 text-gray-600',
};
const emptyFiltrosPlan = { estado: '', desde: '', hasta: '', q: '' };
const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'OTRO', label: 'Otro' },
];
const TIPOS_TICKET = [
  { value: 'NINGUNO', label: 'Sin ticket' },
  { value: 'FISICO', label: '🖨️ Fisico' },
  { value: 'DIGITAL', label: '📧 Digital' },
  { value: 'AMBOS', label: '🖨️📧 Ambos' },
];

const emptyFiltros = { estado: '', desde: '', hasta: '', q: '' };

export default function Apartados() {
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [pageData, setPageData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const hayFiltros = Object.values(filtros).some(Boolean);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalConfirmar, setModalConfirmar] = useState(null);
  const [horasVigencia, setHorasVigencia] = useState(24);
  const [descuentos, setDescuentos] = useState({});
  const [modalCompletar, setModalCompletar] = useState(null);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [tipoTicket, setTipoTicket] = useState('NINGUNO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivo, setMotivo] = useState('');
  const { notify, confirmDialog } = useNotify();

  const [tab, setTab] = useState('productos'); // productos | planes
  const [filtrosPlan, setFiltrosPlan] = useState(emptyFiltrosPlan);
  const [pageDataPlan, setPageDataPlan] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [pagePlan, setPagePlan] = useState(0);
  const [sizePlan, setSizePlan] = useState(20);
  const hayFiltrosPlan = Object.values(filtrosPlan).some(Boolean);
  const [modalDetallePlan, setModalDetallePlan] = useState(null);
  const [modalCancelarPlan, setModalCancelarPlan] = useState(null);
  const [motivoPlan, setMotivoPlan] = useState('');

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, page, size]);

  useEffect(() => {
    if (tab !== 'planes') return;
    const t = setTimeout(loadPlanes, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filtrosPlan, pagePlan, sizePlan]);

  function load() {
    apartadosApi.listApartados(filtros, page, size).then(({ data }) => setPageData(data.data));
  }

  function loadPlanes() {
    apartadosPlanApi.listApartadosPlan(filtrosPlan, pagePlan, sizePlan).then(({ data }) => setPageDataPlan(data.data));
  }

  function cambiarSizePlan(nuevoSize) {
    setPagePlan(0);
    setSizePlan(nuevoSize);
  }

  function actualizarFiltroPlan(campo, valor) {
    setPagePlan(0);
    setFiltrosPlan((f) => ({ ...f, [campo]: valor }));
  }

  async function verDetallePlan(a) {
    const { data } = await apartadosPlanApi.getApartadoPlan(a.id);
    setModalDetallePlan(data.data);
  }

  async function handleConvertirPlan(a) {
    const ok = await confirmDialog(`¿Marcar el apartado #${a.id} como convertido? Esto confirma que ya diste de alta la membresia del cliente.`);
    if (!ok) return;
    try {
      await apartadosPlanApi.convertirApartadoPlan(a.id);
      notify('Apartado marcado como convertido', 'success');
      loadPlanes();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo actualizar', 'error');
    }
  }

  async function handleCancelarPlan(e) {
    e.preventDefault();
    try {
      await apartadosPlanApi.cancelarApartadoPlan(modalCancelarPlan.id, { motivo: motivoPlan || null });
      notify('Apartado cancelado', 'success');
      setModalCancelarPlan(null);
      setMotivoPlan('');
      loadPlanes();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  function cambiarSize(nuevoSize) {
    setPage(0);
    setSize(nuevoSize);
  }

  function actualizarFiltro(campo, valor) {
    setPage(0);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  async function verDetalle(a) {
    const { data } = await apartadosApi.getApartado(a.id);
    setModalDetalle(data.data);
  }

  function abrirConfirmar(a) {
    setModalConfirmar(a);
    setHorasVigencia(24);
    setDescuentos({});
  }

  async function handleConfirmar(e) {
    e.preventDefault();
    const { data } = await apartadosApi.getApartado(modalConfirmar.id);
    const detalle = data.data;
    const sinStock = detalle.items.find((i) => i.disponible != null && i.disponible < i.cantidad);
    if (sinStock) {
      const ok = await confirmDialog(`"${sinStock.articuloNombre}" ya no tiene suficiente stock disponible. ¿Confirmar de todas formas?`, { danger: true });
      if (!ok) return;
    }
    try {
      await apartadosApi.confirmarApartado(modalConfirmar.id, {
        horasVigencia: Number(horasVigencia),
        descuentos: Object.entries(descuentos).map(([articuloId, descuento]) => ({ articuloId: Number(articuloId), descuento: Number(descuento) })),
      });
      notify('Apartado confirmado', 'success');
      setModalConfirmar(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo confirmar', 'error');
    }
  }

  function abrirCompletar(a) {
    setModalCompletar(a);
    setMetodoPago('EFECTIVO');
    setTipoTicket('NINGUNO');
    setMontoRecibido('');
  }

  async function handleCompletar(e) {
    e.preventDefault();
    try {
      const { data } = await apartadosApi.completarApartado(modalCompletar.id, {
        metodoPago,
        tipoTicket,
        montoRecibido: metodoPago === 'EFECTIVO' ? Number(montoRecibido || 0) : null,
      });
      notify('Apartado completado', 'success');
      if ((tipoTicket === 'FISICO' || tipoTicket === 'AMBOS') && data.data.ventaId) {
        try { await printVentaTicket(data.data.ventaId); } catch (err) { notify(err.message, 'error'); }
      }
      setModalCompletar(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo completar', 'error');
    }
  }

  async function handleCancelar(e) {
    e.preventDefault();
    try {
      await apartadosApi.cancelarApartado(modalCancelar.id, { motivo: motivo || null });
      notify('Apartado cancelado', 'success');
      setModalCancelar(null);
      setMotivo('');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  async function quitarItem(apartadoId, itemId) {
    const ok = await confirmDialog('Quitar este articulo del apartado?');
    if (!ok) return;
    try {
      const { data } = await apartadosApi.quitarItemApartado(apartadoId, itemId);
      setModalDetalle(data.data);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo quitar', 'error');
    }
  }

  const totalCompletar = modalCompletar ? Number(modalCompletar.total) : 0;
  const cambioCompletar = Number(montoRecibido || 0) - totalCompletar;

  const totalCompletarPlan = modalCancelarPlan ? Number(modalCancelarPlan.montoAnticipo) : 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Apartados</h1>

      <div className="flex gap-6 border-b border-gray-200 mb-4 text-sm">
        <button type="button" className={'pb-2 ' + (tab === 'productos' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('productos')}>
          🛍️ Productos
        </button>
        <button type="button" className={'pb-2 ' + (tab === 'planes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('planes')}>
          📋 Planes
        </button>
      </div>

      {tab === 'productos' && (
      <>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
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
          <label className="text-xs font-medium text-gray-600 block mb-1">Cliente o producto</label>
          <input className="input" placeholder="🔍 Buscar por nombre, telefono o producto..." value={filtros.q} onChange={(e) => actualizarFiltro('q', e.target.value)} />
        </div>
        {hayFiltros && (
          <button type="button" className="btn-secondary text-sm" onClick={() => { setPage(0); setFiltros(emptyFiltros); }}>
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
              <th>Total</th>
              <th>Solicitado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">#{a.id}</td>
                <td className="text-gray-600">{a.clienteNombre}<br /><span className="text-xs text-gray-400">{a.clienteTelefono}</span></td>
                <td className="text-gray-600">${Number(a.total).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(a.solicitadoEn).toLocaleString()}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[a.estado]}>{a.estado}</span></td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => verDetalle(a)}>Ver</button>
                  {a.estado === 'PENDIENTE' && (
                    <>
                      <button className="text-emerald-600 hover:underline" onClick={() => abrirConfirmar(a)}>Confirmar</button>
                      <button className="text-red-600 hover:underline" onClick={() => setModalCancelar(a)}>Cancelar</button>
                    </>
                  )}
                  {a.estado === 'ACTIVO' && (
                    <>
                      <button className="text-emerald-600 hover:underline" onClick={() => abrirCompletar(a)}>Completar</button>
                      <button className="text-red-600 hover:underline" onClick={() => setModalCancelar(a)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">Sin apartados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page} totalPages={pageData.totalPages} onChange={setPage}
          size={size} onSizeChange={cambiarSize} totalElements={pageData.totalElements}
          pageSizes={[10, 20, 50]} countMode="total"
        />
      </div>
      </>
      )}

      {tab === 'planes' && (
      <>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filtrosPlan.estado} onChange={(e) => actualizarFiltroPlan('estado', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_PLAN.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={filtrosPlan.desde} onChange={(e) => actualizarFiltroPlan('desde', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={filtrosPlan.hasta} onChange={(e) => actualizarFiltroPlan('hasta', e.target.value)} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Cliente o plan</label>
          <input className="input" placeholder="🔍 Buscar por nombre, telefono o plan..." value={filtrosPlan.q} onChange={(e) => actualizarFiltroPlan('q', e.target.value)} />
        </div>
        {hayFiltrosPlan && (
          <button type="button" className="btn-secondary text-sm" onClick={() => { setPagePlan(0); setFiltrosPlan(emptyFiltrosPlan); }}>
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
            {pageDataPlan.content.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">#{a.id}</td>
                <td className="text-gray-600">{a.clienteNombre}<br /><span className="text-xs text-gray-400">{a.clienteTelefono}</span></td>
                <td className="text-gray-600">{a.planNombre}</td>
                <td className="text-gray-600">${Number(a.montoAnticipo).toFixed(2)}</td>
                <td className="text-gray-500">{new Date(a.solicitadoEn).toLocaleString()}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_PLAN_COLOR[a.estado]}>{a.estado}</span></td>
                <td className="text-right space-x-2">
                  <button className="text-brand-600 hover:underline" onClick={() => verDetallePlan(a)}>Ver</button>
                  {a.estado === 'PENDIENTE' && (
                    <>
                      <button className="text-emerald-600 hover:underline" onClick={() => handleConvertirPlan(a)}>Convertido</button>
                      <button className="text-red-600 hover:underline" onClick={() => setModalCancelarPlan(a)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {pageDataPlan.content.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-400">Sin apartados de plan</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={pagePlan} totalPages={pageDataPlan.totalPages} onChange={setPagePlan}
          size={sizePlan} onSizeChange={cambiarSizePlan} totalElements={pageDataPlan.totalElements}
          pageSizes={[10, 20, 50]} countMode="total"
        />
      </div>
      </>
      )}

      {modalDetallePlan && (
        <Modal title={`Apartado de plan #${modalDetallePlan.id}`} onClose={() => setModalDetallePlan(null)}>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Cliente</span><span>{modalDetallePlan.clienteNombre} · {modalDetallePlan.clienteTelefono}</span></div>
            <div className="flex justify-between"><span>Correo</span><span>{modalDetallePlan.clienteEmail}</span></div>
            <div className="flex justify-between"><span>Plan</span><span>{modalDetallePlan.planNombre}</span></div>
            <div className="flex justify-between"><span>Precio del plan</span><span>${Number(modalDetallePlan.precioPlan).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Anticipo pagado (tarjeta)</span><span>${Number(modalDetallePlan.montoAnticipo).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Estado</span><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_PLAN_COLOR[modalDetallePlan.estado]}>{modalDetallePlan.estado}</span></div>
            {modalDetallePlan.notas && <p className="italic text-gray-500">{modalDetallePlan.notas}</p>}
            {modalDetallePlan.canceladoEn && (
              <div className="flex justify-between"><span>Cancelado por</span><span>{modalDetallePlan.canceladoPorNombre} · {new Date(modalDetallePlan.canceladoEn).toLocaleString()}</span></div>
            )}
            {modalDetallePlan.motivoCancelacion && <p className="italic text-gray-500">Motivo: {modalDetallePlan.motivoCancelacion}</p>}
            {modalDetallePlan.convertidoEn && (
              <div className="flex justify-between"><span>Convertido por</span><span>{modalDetallePlan.convertidoPorNombre} · {new Date(modalDetallePlan.convertidoEn).toLocaleString()}</span></div>
            )}
          </div>
        </Modal>
      )}

      {modalCancelarPlan && (
        <Modal title={`Cancelar apartado de plan #${modalCancelarPlan.id}`} onClose={() => setModalCancelarPlan(null)}>
          <form onSubmit={handleCancelarPlan} className="space-y-3">
            <p className="text-sm text-gray-600">
              El anticipo de <strong>${totalCompletarPlan.toFixed(2)}</strong> quedara anulado en Caja. El reembolso al cliente se maneja fuera del sistema.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea className="input" rows={3} value={motivoPlan} onChange={(e) => setMotivoPlan(e.target.value)} />
            </div>
            <button className="btn-danger w-full mt-2">Cancelar apartado</button>
          </form>
        </Modal>
      )}

      {modalDetalle && (
        <Modal title={`Apartado #${modalDetalle.id}`} onClose={() => setModalDetalle(null)} wide>
          <div className="text-sm space-y-1 mb-3">
            <div className="flex justify-between"><span>Cliente</span><span>{modalDetalle.clienteNombre} · {modalDetalle.clienteTelefono}</span></div>
            {modalDetalle.clienteEmail && <div className="flex justify-between"><span>Correo</span><span>{modalDetalle.clienteEmail}</span></div>}
            <div className="flex justify-between"><span>Estado</span><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[modalDetalle.estado]}>{modalDetalle.estado}</span></div>
            {modalDetalle.expiraEn && <div className="flex justify-between"><span>Vence</span><span>{new Date(modalDetalle.expiraEn).toLocaleString()}</span></div>}
            {modalDetalle.notas && <p className="italic text-gray-500">{modalDetalle.notas}</p>}
          </div>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1">Articulo</th><th>Cant.</th><th>Descuento</th><th>Subtotal</th>
                {modalDetalle.estado === 'PENDIENTE' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {modalDetalle.items.map((i) => (
                <tr key={i.id} className="border-b border-gray-50">
                  <td className="py-1">
                    {i.articuloNombre}
                    {i.disponible != null && i.disponible < i.cantidad && (
                      <span className="text-red-600 text-xs block">Solo {i.disponible} disponibles</span>
                    )}
                  </td>
                  <td>{i.cantidad}</td>
                  <td>${Number(i.descuento).toFixed(2)}</td>
                  <td>${Number(i.subtotal).toFixed(2)}</td>
                  {modalDetalle.estado === 'PENDIENTE' && (
                    <td><button className="text-red-600 text-xs" onClick={() => quitarItem(modalDetalle.id, i.id)}>Quitar</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-semibold text-gray-800">Total: ${Number(modalDetalle.total).toFixed(2)}</p>
        </Modal>
      )}

      {modalConfirmar && (
        <Modal title={`Confirmar apartado #${modalConfirmar.id}`} onClose={() => setModalConfirmar(null)}>
          <form onSubmit={handleConfirmar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas para recoger</label>
              <input type="number" min="1" className="input" value={horasVigencia} onChange={(e) => setHorasVigencia(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400">Al confirmar se descuenta el stock y se le avisa al cliente.</p>
            <button className="btn-primary w-full mt-2">Confirmar apartado</button>
          </form>
        </Modal>
      )}

      {modalCompletar && (
        <Modal title={`Completar apartado #${modalCompletar.id}`} onClose={() => setModalCompletar(null)}>
          <form onSubmit={handleCompletar} className="space-y-3">
            <p className="text-sm text-gray-600">Total a cobrar: <strong>${Number(modalCompletar.total).toFixed(2)}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
              <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {metodoPago === 'EFECTIVO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido</label>
                <input type="number" step="0.01" className="input" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} />
                {montoRecibido !== '' && (
                  <p className={'text-xs mt-1 ' + (cambioCompletar < 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {cambioCompletar < 0 ? `Falta $${Math.abs(cambioCompletar).toFixed(2)}` : `Cambio: $${cambioCompletar.toFixed(2)}`}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticket</label>
              <select className="input" value={tipoTicket} onChange={(e) => setTipoTicket(e.target.value)}>
                {TIPOS_TICKET.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full mt-2">Completar y cobrar</button>
          </form>
        </Modal>
      )}

      {modalCancelar && (
        <Modal title={`Cancelar apartado #${modalCancelar.id}`} onClose={() => setModalCancelar(null)}>
          <form onSubmit={handleCancelar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <button className="btn-danger w-full mt-2">Cancelar apartado</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
