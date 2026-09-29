import { useEffect, useState } from 'react';
import * as cortesCajaApi from '../api/cortesCaja';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const ESTADO_COLOR = { ABIERTO: 'bg-emerald-100 text-emerald-700', CERRADO: 'bg-gray-100 text-gray-600' };
const emptyFiltros = { desde: '', hasta: '', estado: '', usuarioId: '' };

export default function CortesCaja() {
  const [corteAbierto, setCorteAbierto] = useState(null);
  const [historial, setHistorial] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [cajeros, setCajeros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [notasApertura, setNotasApertura] = useState('');
  const [modalCerrar, setModalCerrar] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [gastos, setGastos] = useState('');
  const [notasCierre, setNotasCierre] = useState('');
  const [modalDetalle, setModalDetalle] = useState(null);
  const { notify, confirmDialog } = useNotify();
  const hayFiltros = Object.values(filtros).some(Boolean);

  useEffect(() => {
    cortesCajaApi.listCajeros().then(({ data }) => setCajeros(data.data));
  }, []);

  useEffect(() => { cargarTodo(); }, [page, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  function cargarTodo() {
    setLoading(true);
    Promise.all([
      cortesCajaApi.getCorteAbierto(),
      cortesCajaApi.listCortesCaja(filtros, page, 20),
    ]).then(([abierto, lista]) => {
      setCorteAbierto(abierto.data.data);
      setHistorial(lista.data.data);
    }).finally(() => setLoading(false));
  }

  function actualizarFiltro(campo, valor) {
    setPage(0);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  async function handleAbrir(e) {
    e.preventDefault();
    try {
      await cortesCajaApi.abrirCorteCaja({ montoInicial: Number(montoInicial || 0), notas: notasApertura || null });
      notify('Corte abierto', 'success');
      setModalAbrir(false);
      setMontoInicial('');
      setNotasApertura('');
      cargarTodo();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo abrir el corte', 'error');
    }
  }

  async function openCerrar() {
    if (!corteAbierto) return;
    const { data } = await cortesCajaApi.getCorteCajaResumen(corteAbierto.id);
    setResumen(data.data);
    setGastos('');
    setNotasCierre('');
    setModalCerrar(true);
  }

  async function handleCerrar(e) {
    e.preventDefault();
    const ok = await confirmDialog('Cerrar el corte de caja? Esta accion no se puede deshacer.', { danger: true });
    if (!ok) return;
    try {
      await cortesCajaApi.cerrarCorteCaja(corteAbierto.id, { gastos: Number(gastos || 0), notas: notasCierre || null });
      notify('Corte cerrado', 'success');
      setModalCerrar(false);
      cargarTodo();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cerrar el corte', 'error');
    }
  }

  async function verDetalle(c) {
    const { data } = await cortesCajaApi.getCorteCaja(c.id);
    setModalDetalle(data.data);
  }

  const efectivoEsperadoPreview = resumen
    ? Number(resumen.montoInicial) + Number(resumen.ventasEfectivo) - Number(gastos || 0)
    : 0;

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div>
      {corteAbierto ? (
        <div className="card mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-500">Tienes un corte abierto desde</p>
            <p className="font-semibold text-gray-800">{new Date(corteAbierto.abiertoEn).toLocaleString()}</p>
            <p className="text-xs text-gray-400">Fondo inicial: ${Number(corteAbierto.montoInicial).toFixed(2)}</p>
          </div>
          <button className="btn-danger" onClick={openCerrar}>Cerrar corte</button>
        </div>
      ) : (
        <div className="card mb-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">No tienes ningun corte de caja abierto.</p>
          <button className="btn-primary" onClick={() => setModalAbrir(true)}>+ Abrir corte</button>
        </div>
      )}

      <h2 className="font-semibold text-gray-800 mb-3">Historial</h2>

      <div className="card mb-4 flex flex-wrap gap-3 items-end">
        <div className="w-36">
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={filtros.desde} onChange={(e) => actualizarFiltro('desde', e.target.value)} />
        </div>
        <div className="w-36">
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={filtros.hasta} onChange={(e) => actualizarFiltro('hasta', e.target.value)} />
        </div>
        <div className="w-40">
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="ABIERTO">Abierto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </div>
        <div className="w-48">
          <label className="text-xs font-medium text-gray-600 block mb-1">Cajero</label>
          <select className="input" value={filtros.usuarioId} onChange={(e) => actualizarFiltro('usuarioId', e.target.value)}>
            <option value="">Todos</option>
            {cajeros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
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
              <th className="py-2">Cajero</th>
              <th>Abierto</th>
              <th>Cerrado</th>
              <th>Cerrado por</th>
              <th>Ventas</th>
              <th>Transac.</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {historial.content.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{c.usuarioNombre}</td>
                <td className="text-gray-600">{new Date(c.abiertoEn).toLocaleString()}</td>
                <td className="text-gray-600">{c.cerradoEn ? new Date(c.cerradoEn).toLocaleString() : '-'}</td>
                <td className="text-gray-600">{c.cerradoPorNombre || '-'}</td>
                <td className="text-gray-600">${Number(c.totalVentas).toFixed(2)}</td>
                <td className="text-gray-600">{c.totalTransacciones}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[c.estado]}>{c.estado}</span></td>
                <td className="text-right">
                  <button className="text-brand-600 hover:underline" onClick={() => verDetalle(c)}>Ver</button>
                </td>
              </tr>
            ))}
            {historial.content.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-gray-400">Sin cortes registrados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={historial.totalPages} onChange={setPage} />
      </div>

      {modalAbrir && (
        <Modal title="Abrir corte de caja" onClose={() => setModalAbrir(false)}>
          <form onSubmit={handleAbrir} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fondo inicial</label>
              <input type="number" step="0.01" className="input" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={notasApertura} onChange={(e) => setNotasApertura(e.target.value)} />
            </div>
            <button className="btn-primary w-full mt-2">Abrir corte</button>
          </form>
        </Modal>
      )}

      {modalCerrar && resumen && (
        <Modal title="Cerrar corte de caja" onClose={() => setModalCerrar(false)}>
          <form onSubmit={handleCerrar} className="space-y-3">
            <div className="text-sm space-y-1 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between"><span>Fondo inicial</span><span>${Number(resumen.montoInicial).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Ventas efectivo</span><span>${Number(resumen.ventasEfectivo).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Ventas tarjeta</span><span>${Number(resumen.ventasTarjeta).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Ventas transferencia</span><span>${Number(resumen.ventasTransferencia).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total transacciones</span><span>{resumen.totalTransacciones}</span></div>
              {resumen.canceladas > 0 && (
                <div className="flex justify-between text-red-600"><span>Canceladas</span><span>{resumen.canceladas} (${Number(resumen.totalCancelado).toFixed(2)})</span></div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gastos del turno (opcional)</label>
              <input type="number" step="0.01" className="input" value={gastos} onChange={(e) => setGastos(e.target.value)} />
            </div>
            <p className="text-sm font-semibold text-gray-800">Efectivo esperado en caja: ${efectivoEsperadoPreview.toFixed(2)}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)} />
            </div>
            <button className="btn-danger w-full mt-2">Cerrar corte</button>
          </form>
        </Modal>
      )}

      {modalDetalle && (
        <Modal title={`Corte #${modalDetalle.id}`} onClose={() => setModalDetalle(null)}>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Cajero</span><span>{modalDetalle.usuarioNombre}</span></div>
            <div className="flex justify-between"><span>Abierto</span><span>{new Date(modalDetalle.abiertoEn).toLocaleString()}</span></div>
            {modalDetalle.cerradoEn && (
              <div className="flex justify-between"><span>Cerrado</span><span>{new Date(modalDetalle.cerradoEn).toLocaleString()} {modalDetalle.cerradoPorNombre ? `por ${modalDetalle.cerradoPorNombre}` : ''}</span></div>
            )}
            <div className="flex justify-between"><span>Fondo inicial</span><span>${Number(modalDetalle.montoInicial).toFixed(2)}</span></div>
            {modalDetalle.montoFinal != null && (
              <div className="flex justify-between"><span>Monto final</span><span>${Number(modalDetalle.montoFinal).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span>Gastos</span><span>${Number(modalDetalle.gastos).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Ventas efectivo</span><span>${Number(modalDetalle.ventasEfectivo).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Ventas tarjeta</span><span>${Number(modalDetalle.ventasTarjeta).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Ventas transferencia</span><span>${Number(modalDetalle.ventasTransferencia).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total ventas</span><span>${Number(modalDetalle.totalVentas).toFixed(2)}</span></div>
            {modalDetalle.notas && <p className="italic text-gray-500 mt-2">{modalDetalle.notas}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
