import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as apartadosApi from '../api/apartados';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import ApartadosPlanPanel from '../components/ApartadosPlanPanel.jsx';
import { printVentaTicket } from '../utils/printer';

// Cada cuanto se revisa si llegaron apartados nuevos de la tienda en linea mientras esta
// pantalla esta abierta (aviso propio de este modulo, aparte de la campana global).
const POLL_PENDIENTES_MS = 30_000;

const ESTADOS = ['PENDIENTE', 'ACTIVO', 'COMPLETADO', 'CANCELADO', 'VENCIDO'];
const ESTADO_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  COMPLETADO: 'bg-blue-100 text-blue-700',
  CANCELADO: 'bg-gray-100 text-gray-600',
  VENCIDO: 'bg-red-100 text-red-700',
};

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

// Celular en formato internacional para WhatsApp (wa.me): ultimos 10 digitos + lada 52 de Mexico.
function whatsappUrl(telefono, mensaje) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const numero = digitos.length > 10 ? digitos : `52${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/** Datos del cliente con atajos para avisarle (llamar, WhatsApp y correo con el mensaje listo). */
function ContactoCliente({ apartado, motivo }) {
  const { user } = useAuth();
  const centro = user?.centroNombre || 'el centro';
  const productos = (apartado.items || []).map((i) => `${i.cantidad} x ${i.articuloNombre}`).join(', ');
  const mensaje = `Hola ${apartado.clienteNombre}, te escribimos de ${centro} sobre tu apartado #${apartado.id}`
    + (productos ? ` (${productos})` : '') + '. '
    + (motivo?.trim() ? `${motivo.trim()}. ` : '')
    + 'Lamentamos el inconveniente; si quieres, te ayudamos a elegir otra opción.';
  const wa = whatsappUrl(apartado.clienteTelefono, mensaje);
  const mail = apartado.clienteEmail
    ? `mailto:${apartado.clienteEmail}?subject=${encodeURIComponent(`Tu apartado #${apartado.id} - ${centro}`)}&body=${encodeURIComponent(mensaje)}`
    : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${apartado.clienteNombre} · ${apartado.clienteTelefono}${apartado.clienteEmail ? ` · ${apartado.clienteEmail}` : ''}`);
    } catch { /* sin permiso de portapapeles: no pasa nada */ }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="text-xs font-medium text-gray-500">Cliente</p>
      <p className="font-semibold text-gray-800">{apartado.clienteNombre}</p>
      <p className="text-gray-700">📞 {apartado.clienteTelefono || 'Sin teléfono'}</p>
      <p className="text-gray-700 break-all">✉️ {apartado.clienteEmail || 'Sin correo'}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {apartado.clienteTelefono && (
          <a href={`tel:${apartado.clienteTelefono}`} className="btn-secondary text-xs py-1">Llamar</a>
        )}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1">WhatsApp</a>}
        {mail && <a href={mail} className="btn-secondary text-xs py-1">Enviar correo</a>}
        <button type="button" className="btn-secondary text-xs py-1" onClick={copiar}>Copiar datos</button>
      </div>
    </div>
  );
}

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

  // ?tab=planes: la notificacion de "nuevo apartado de membresia" abre directo esta pestana.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'planes' ? 'planes' : 'productos';
  const setTab = (t) => setSearchParams(t === 'planes' ? { tab: 'planes' } : {}, { replace: true });

  // Aviso propio del modulo: cuantos apartados esperan revision, y si llego uno nuevo
  // mientras esta pantalla estaba abierta (se detecta comparando contra el conteo anterior).
  const [pendientes, setPendientes] = useState({ productos: 0, planes: 0 });
  const [nuevos, setNuevos] = useState({ productos: 0, planes: 0 });
  const [recargarPlanes, setRecargarPlanes] = useState(0);
  const pendientesPrevios = useRef(null);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, page, size]);

  useEffect(() => {
    revisarPendientes();
    const interval = setInterval(revisarPendientes, POLL_PENDIENTES_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    apartadosApi.listApartados(filtros, page, size).then(({ data }) => setPageData(data.data));
  }

  async function revisarPendientes() {
    try {
      const { data } = await apartadosApi.getApartadosPendientes();
      const actual = data.data;
      const previo = pendientesPrevios.current;
      if (previo) {
        const masProductos = Math.max(0, actual.productos - previo.productos);
        const masPlanes = Math.max(0, actual.planes - previo.planes);
        if (masProductos > 0 || masPlanes > 0) {
          setNuevos((n) => ({ productos: n.productos + masProductos, planes: n.planes + masPlanes }));
          if (masProductos > 0) load();
          if (masPlanes > 0) setRecargarPlanes((x) => x + 1);
        }
      }
      pendientesPrevios.current = actual;
      setPendientes(actual);
    } catch {
      // Sin permiso o sin red: el aviso simplemente no se muestra.
    }
  }

  function despuesDeCambio() {
    load();
    revisarPendientes();
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
      despuesDeCambio();
    } catch (err) {
      const mensaje = err.response?.data?.message || 'No se pudo confirmar';
      notify(mensaje, 'error');
      // Sin stock para confirmarlo (otra solicitud se confirmo primero o se vendio en tienda):
      // se abre de una vez la cancelacion con los datos del cliente para avisarle.
      if (/stock/i.test(mensaje)) {
        const apartado = modalConfirmar;
        setModalConfirmar(null);
        abrirCancelar(apartado);
      }
    }
  }

  /** Abre la cancelacion con el detalle completo (contacto del cliente y que productos ya no
   * alcanzan), y prellena el motivo si hay productos sin stock. */
  async function abrirCancelar(a) {
    try {
      const { data } = await apartadosApi.getApartado(a.id);
      const detalle = data.data;
      const sinStock = detalle.items.filter((i) => i.disponible != null && i.disponible < i.cantidad);
      setModalCancelar({ ...detalle, sinStock });
      setMotivo(sinStock.length > 0
        ? `Ya no hay stock disponible de: ${sinStock.map((i) => i.articuloNombre).join(', ')}`
        : '');
    } catch {
      setModalCancelar({ ...a, items: [], sinStock: [] });
      setMotivo('');
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
      despuesDeCambio();
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
      despuesDeCambio();
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
      despuesDeCambio();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo quitar', 'error');
    }
  }

  const totalCompletar = modalCompletar ? Number(modalCompletar.total) : 0;
  const cambioCompletar = Number(montoRecibido || 0) - totalCompletar;
  const totalNuevos = nuevos.productos + nuevos.planes;
  const totalPendientes = pendientes.productos + pendientes.planes;

  function verNuevos() {
    const irA = nuevos.productos > 0 ? 'productos' : 'planes';
    setTab(irA);
    if (irA === 'productos') { setPage(0); setFiltros({ ...emptyFiltros, estado: 'PENDIENTE' }); }
    setNuevos({ productos: 0, planes: 0 });
  }

  const badge = (n) => n > 0 && (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{n}</span>
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Apartados</h1>

      {totalNuevos > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-50 border border-brand-200 text-brand-800 text-sm rounded-lg px-4 py-3 mb-4 animate-pulse">
          <span>
            🔔 <strong>¡Se {totalNuevos === 1 ? 'recibió un nuevo apartado' : `recibieron ${totalNuevos} nuevos apartados`}</strong> desde la tienda en línea
            {nuevos.productos > 0 && nuevos.planes > 0 && ` (${nuevos.productos} de productos y ${nuevos.planes} de membresía)`}.
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn-primary text-xs py-1" onClick={verNuevos}>Ver</button>
            <button type="button" className="btn-secondary text-xs py-1" onClick={() => setNuevos({ productos: 0, planes: 0 })}>Ocultar</button>
          </span>
        </div>
      ) : totalPendientes > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2 mb-4">
          ⏳ Tienes {totalPendientes} apartado{totalPendientes === 1 ? '' : 's'} pendiente{totalPendientes === 1 ? '' : 's'} de revisar
          {pendientes.productos > 0 && pendientes.planes > 0 && ` (${pendientes.productos} de productos y ${pendientes.planes} de membresía)`}.
        </div>
      )}

      <div className="flex gap-6 border-b border-gray-200 mb-4 text-sm">
        <button type="button" className={'pb-2 ' + (tab === 'productos' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('productos')}>
          🛍️ Productos{badge(pendientes.productos)}
        </button>
        <button type="button" className={'pb-2 ' + (tab === 'planes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('planes')}>
          📋 Planes{badge(pendientes.planes)}
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
                      <button className="text-red-600 hover:underline" onClick={() => abrirCancelar(a)}>Cancelar</button>
                    </>
                  )}
                  {a.estado === 'ACTIVO' && (
                    <>
                      <button className="text-emerald-600 hover:underline" onClick={() => abrirCompletar(a)}>Completar</button>
                      <button className="text-red-600 hover:underline" onClick={() => abrirCancelar(a)}>Cancelar</button>
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
        <ApartadosPlanPanel recargarToken={recargarPlanes} onCambio={revisarPendientes} />
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
            {modalCancelar.sinStock?.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">
                ⚠️ Ya no hay stock suficiente para este apartado. Avísale al cliente antes o después de cancelarlo.
              </div>
            )}
            <ContactoCliente apartado={modalCancelar} motivo={motivo} />
            {modalCancelar.items?.length > 0 && (
              <div className="text-sm">
                <p className="text-xs font-medium text-gray-600 mb-1">Productos del apartado</p>
                {modalCancelar.items.map((i) => {
                  const falta = i.disponible != null && i.disponible < i.cantidad;
                  return (
                    <div key={i.id} className={'flex justify-between gap-2 py-0.5 ' + (falta ? 'text-red-600' : 'text-gray-700')}>
                      <span>{i.cantidad} x {i.articuloNombre}</span>
                      {falta && <span className="text-xs whitespace-nowrap">solo {Math.max(0, i.disponible)} disponibles</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              {modalCancelar.clienteEmail && (
                <p className="text-xs text-gray-400 mt-1">Al cancelar, el sistema también le manda un correo con este motivo.</p>
              )}
            </div>
            <button className="btn-danger w-full mt-2">Cancelar apartado</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
