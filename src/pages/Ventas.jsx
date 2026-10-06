import { useEffect, useState } from 'react';
import * as ventasApi from '../api/ventas';
import * as cortesCajaApi from '../api/cortesCaja';
import * as sucursalesApi from '../api/sucursales';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { printVentaTicket } from '../utils/printer';

// El Dueno/SUPER_ADMIN ve la pantalla "en vivo": se refresca sola cada 20s sin que tenga
// que recargar, igual que un panel de monitoreo -- el resto de roles ya ve una lista fija
// acotada a su sucursal, sin necesidad de este refresco constante.
const INTERVALO_EN_VIVO_MS = 20_000;

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'OTRO', label: 'Otro' },
];
const ESTADO_COLOR = {
  COMPLETADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-red-100 text-red-700',
};

const emptyFiltros = { desde: '', hasta: '', cliente: '', metodoPago: '', estado: '', usuarioId: '', sucursalId: '' };

export default function Ventas() {
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [pageData, setPageData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const hayFiltros = Object.values(filtros).some(Boolean);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const { hasPermiso, isSupervisor, isSuperAdmin } = useAuth();
  const { notify, confirmDialog } = useNotify();
  // Solo el Dueno/SUPER_ADMIN ve todas las sucursales a la vez y filtra libre por
  // sucursal/vendedor (seccion 36 del encargo) -- el resto ya ve una lista fija.
  const veTodasLasSucursales = isSupervisor || isSuperAdmin;

  useEffect(() => {
    if (!veTodasLasSucursales) return;
    cortesCajaApi.listCajeros().then(({ data }) => setVendedores(data.data));
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, page, size]);

  // "En vivo": refresca la pagina actual sola, sin pisar lo que el usuario este viendo
  // (el modal de detalle es estado aparte, no se cierra con el refresco).
  useEffect(() => {
    const interval = setInterval(load, INTERVALO_EN_VIVO_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, page, size]);

  function load() {
    ventasApi.listVentas(filtros, page, size).then(({ data }) => setPageData(data.data));
  }

  function actualizarFiltro(campo, valor) {
    setPage(0);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  function cambiarSize(nuevoSize) {
    setPage(0);
    setSize(nuevoSize);
  }

  async function verDetalle(v) {
    const { data } = await ventasApi.getVenta(v.id);
    setModalDetalle(data.data);
  }

  async function reimprimir(id) {
    try {
      await printVentaTicket(id);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function cancelar(v) {
    const ok = await confirmDialog(`Cancelar la venta #${v.id}? Esto repone el inventario y anula el movimiento de caja.`, { danger: true });
    if (!ok) return;
    try {
      await ventasApi.cancelarVenta(v.id);
      notify('Venta cancelada', 'success');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-gray-800">Ventas</h1>
        {veTodasLasSucursales && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={filtros.desde} onChange={(e) => actualizarFiltro('desde', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={filtros.hasta} onChange={(e) => actualizarFiltro('hasta', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cliente</label>
          <input className="input" placeholder="Nombre del cliente" value={filtros.cliente} onChange={(e) => actualizarFiltro('cliente', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Metodo</label>
          <select className="input" value={filtros.metodoPago} onChange={(e) => actualizarFiltro('metodoPago', e.target.value)}>
            <option value="">Todos</option>
            {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
        {veTodasLasSucursales && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sucursal</label>
              <select className="input" value={filtros.sucursalId} onChange={(e) => actualizarFiltro('sucursalId', e.target.value)}>
                <option value="">Todas</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Vendedor</label>
              <select className="input" value={filtros.usuarioId} onChange={(e) => actualizarFiltro('usuarioId', e.target.value)}>
                <option value="">Todos</option>
                {vendedores.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          </>
        )}
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
              <th className="py-2">#</th>
              <th>Fecha</th>
              {veTodasLasSucursales && <th>Sucursal</th>}
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Metodo</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((v) => (
              <tr key={v.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">#{v.id}</td>
                <td className="text-gray-500">{new Date(v.createdAt).toLocaleString()}</td>
                {veTodasLasSucursales && <td className="text-gray-600">{v.sucursalNombre || '-'}</td>}
                <td className="text-gray-600">{v.clienteNombre || 'Publico general'}</td>
                <td className="text-gray-600">{v.usuarioNombre}</td>
                <td className="text-gray-600">{v.metodoPago}</td>
                <td className="text-gray-600">${Number(v.total).toFixed(2)}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + (ESTADO_COLOR[v.estado] || 'bg-gray-100 text-gray-600')}>{v.estado}</span></td>
                <td className="text-right space-x-2 whitespace-nowrap">
                  <button className="text-brand-600 hover:underline" onClick={() => verDetalle(v)}>Ver</button>
                  <button className="text-gray-600 hover:underline" onClick={() => reimprimir(v.id)}>🖨️ Reimprimir</button>
                  {v.estado === 'COMPLETADA' && hasPermiso('VENTAS_CANCELAR') && (
                    <button className="text-red-600 hover:underline" onClick={() => cancelar(v)}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={veTodasLasSucursales ? 9 : 8} className="py-6 text-center text-gray-400">Sin ventas</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page} totalPages={pageData.totalPages} onChange={setPage}
          size={size} onSizeChange={cambiarSize} totalElements={pageData.totalElements}
        />
      </div>

      {modalDetalle && (
        <Modal title={`Venta #${modalDetalle.id}`} onClose={() => setModalDetalle(null)} wide>
          <div className="text-sm space-y-1 mb-3">
            <div className="flex justify-between"><span>Cliente</span><span>{modalDetalle.clienteNombre || 'Publico general'}</span></div>
            {modalDetalle.clienteEmail && <div className="flex justify-between"><span>Correo</span><span>{modalDetalle.clienteEmail}</span></div>}
            <div className="flex justify-between"><span>Vendedor</span><span>{modalDetalle.usuarioNombre}</span></div>
            {modalDetalle.sucursalNombre && (
              <div className="flex justify-between"><span>Sucursal</span><span>{modalDetalle.sucursalNombre}</span></div>
            )}
            <div className="flex justify-between"><span>Metodo de pago</span><span>{modalDetalle.metodoPago}</span></div>
            <div className="flex justify-between"><span>Estado</span><span className={'px-2 py-0.5 rounded-full text-xs ' + (ESTADO_COLOR[modalDetalle.estado] || 'bg-gray-100 text-gray-600')}>{modalDetalle.estado}</span></div>
            <div className="flex justify-between"><span>Fecha</span><span>{new Date(modalDetalle.createdAt).toLocaleString()}</span></div>
            {modalDetalle.notas && <p className="italic text-gray-500">{modalDetalle.notas}</p>}
          </div>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1">Articulo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {modalDetalle.items?.map((i) => (
                <tr key={i.id} className="border-b border-gray-50">
                  <td className="py-1">{i.articuloNombre}</td>
                  <td>{i.cantidad}</td>
                  <td>${Number(i.precioUnitario ?? 0).toFixed(2)}</td>
                  <td>${Number(i.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>${Number(modalDetalle.subtotal).toFixed(2)}</span></div>
            {Number(modalDetalle.descuento) > 0 && <div className="flex justify-between"><span>Descuento</span><span>-${Number(modalDetalle.descuento).toFixed(2)}</span></div>}
            {Number(modalDetalle.impuesto) > 0 && <div className="flex justify-between"><span>Impuesto</span><span>${Number(modalDetalle.impuesto).toFixed(2)}</span></div>}
            <p className="text-right font-semibold text-gray-800">Total: ${Number(modalDetalle.total).toFixed(2)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
