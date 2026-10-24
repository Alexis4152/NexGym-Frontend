import { useEffect, useState } from 'react';
import * as cortesCajaApi from '../../api/cortesCaja';
import * as sucursalesApi from '../../api/sucursales';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { fmt, fmtFecha, Fila, ListaMovimientos, EstadoBadge, Diferencia, METODO_CONTEO_LABEL } from './comun.jsx';

const ESTADO_COLOR = { ABIERTO: 'bg-emerald-100 text-emerald-700', CERRADO: 'bg-gray-100 text-gray-600' };
const emptyFiltros = { desde: '', hasta: '', estado: '', usuarioId: '', sucursalId: '' };

// Un corte CERRADO sin cerradoPorNombre lo cerro el job automatico (CorteCajaService#autoCerrar).
function cerradoPorLabel(c) {
  if (c.estado !== 'CERRADO') return '—';
  return c.cerradoPorNombre || 'Sistema';
}

// Pestaña "Historial": cortes con filtros (Dueño/SUPER_ADMIN filtra libre; Encargado ve los de
// su sucursal; el resto, los propios) y detalle con entrega, arqueo, membresias y movimientos.
export default function HistorialTab() {
  const { isSupervisor, isSuperAdmin } = useAuth();
  const puedeFiltrar = isSupervisor || isSuperAdmin;
  const [historial, setHistorial] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [cajeros, setCajeros] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const hayFiltros = Object.values(filtros).some(Boolean);

  useEffect(() => {
    if (!puedeFiltrar) return;
    cortesCajaApi.listCajeros().then(({ data }) => setCajeros(data.data));
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cortesCajaApi.listCortesCaja(filtros, page, 20).then(({ data }) => setHistorial(data.data));
  }, [page, filtros]);

  function actualizarFiltro(campo, valor) {
    setPage(0);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  async function verDetalle(c) {
    const [{ data: d }, { data: m }, { data: r }] = await Promise.all([
      cortesCajaApi.getCorteCaja(c.id), cortesCajaApi.listMovimientosCorte(c.id), cortesCajaApi.listMovimientosRecibidos(c.id),
    ]);
    setDetalle({ ...d.data, movimientos: m.data, recibidos: r.data });
  }

  return (
    <div>
      {puedeFiltrar && (
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
          <div className="w-48">
            <label className="text-xs font-medium text-gray-600 block mb-1">Sucursal</label>
            <select className="input" value={filtros.sucursalId} onChange={(e) => actualizarFiltro('sucursalId', e.target.value)}>
              <option value="">Todas</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          {hayFiltros && (
            <button type="button" className="btn-secondary text-sm" onClick={() => { setPage(0); setFiltros(emptyFiltros); }}>Limpiar filtros</button>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Cajero</th>
              <th>Caja</th>
              <th>Abierto</th>
              <th>Cerrado</th>
              <th>Esperado</th>
              <th>Contado</th>
              <th>Arqueo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {historial.content.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{c.usuarioNombre}</td>
                <td className="text-gray-600">{c.cajaNombre || '—'}{c.sucursalNombre && <span className="block text-[11px] text-gray-400">{c.sucursalNombre}</span>}</td>
                <td className="text-gray-600">{fmtFecha(c.abiertoEn)}</td>
                <td className="text-gray-600">{fmtFecha(c.cerradoEn)}<span className="block text-[11px] text-gray-400">{cerradoPorLabel(c)}</span></td>
                <td className="text-gray-600">{fmt(c.montoFinal)}</td>
                <td className="text-gray-600">{fmt(c.montoContado)}</td>
                <td>{c.estadoArqueo ? <EstadoBadge estado={c.estadoArqueo} /> : <span className="text-gray-300">—</span>}</td>
                <td><span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[c.estado]}>{c.estado}</span></td>
                <td className="text-right"><button className="text-brand-600 hover:underline" onClick={() => verDetalle(c)}>Ver</button></td>
              </tr>
            ))}
            {historial.content.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-gray-400">Sin cortes registrados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={historial.totalPages} onChange={setPage} />
      </div>

      {detalle && (
        <Modal title={`Corte #${detalle.id}`} onClose={() => setDetalle(null)} wide>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <Fila label="Cajero">{detalle.usuarioNombre}</Fila>
              <Fila label="Caja">{detalle.cajaNombre || '—'}{detalle.sucursalNombre ? ` · ${detalle.sucursalNombre}` : ''}</Fila>
              <Fila label="Abierto">{fmtFecha(detalle.abiertoEn)}</Fila>
              {detalle.cerradoEn && <Fila label="Cerrado">{fmtFecha(detalle.cerradoEn)} · {cerradoPorLabel(detalle)}</Fila>}

              <h4 className="font-semibold text-gray-800 pt-3">Recepción de la caja</h4>
              {detalle.corteAnteriorUsuarioNombre && <Fila label="Recibida de">{detalle.corteAnteriorUsuarioNombre} (#{detalle.corteAnteriorId})</Fila>}
              <Fila label="Debía recibir">{fmt(detalle.montoInicialEsperado)}</Fila>
              <Fila label="Recibió (contado)">{fmt(detalle.montoInicial)}</Fila>
              {detalle.estadoEntrega && <Fila label="Resultado"><EstadoBadge estado={detalle.estadoEntrega} /></Fila>}
              {detalle.diferenciaEntrega != null && Number(detalle.diferenciaEntrega) !== 0 && <Fila label="Diferencia"><Diferencia valor={detalle.diferenciaEntrega} /></Fila>}
              {detalle.notaRecepcion && <p className="italic text-gray-500">“{detalle.notaRecepcion}”</p>}
              {detalle.recibidos?.length > 0 && (
                <div><p className="text-xs font-medium text-gray-600">Movimientos con la caja cerrada que recibió:</p><ListaMovimientos movimientos={detalle.recibidos} /></div>
              )}

              {detalle.estado === 'CERRADO' && (
                <>
                  <h4 className="font-semibold text-gray-800 pt-3">Arqueo de cierre</h4>
                  <Fila label="Efectivo esperado">{fmt(detalle.montoFinal)}</Fila>
                  <Fila label="Efectivo contado">{fmt(detalle.montoContado)}</Fila>
                  {detalle.estadoArqueo && <Fila label="Resultado"><EstadoBadge estado={detalle.estadoArqueo} /></Fila>}
                  {detalle.diferenciaEfectivo != null && <Fila label="Diferencia"><Diferencia valor={detalle.diferenciaEfectivo} /></Fila>}
                  {detalle.metodoConteo && <Fila label="Conteo">{METODO_CONTEO_LABEL[detalle.metodoConteo]}{detalle.contadoPorNombre ? ` · ${detalle.contadoPorNombre}` : ''}</Fila>}
                  {detalle.evidenciaConteoUrl && <Fila label="Evidencia"><a href={detalle.evidenciaConteoUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">ver</a></Fila>}
                  <Fila label="Dejó en la caja" fuerte>{fmt(detalle.montoEntregado)}</Fila>
                </>
              )}
              {detalle.notas && <p className="italic text-gray-500 pt-2">{detalle.notas}</p>}
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-gray-800">Ventas de tienda</h4>
              <Fila label="Efectivo">{fmt(detalle.ventasEfectivo)}</Fila>
              <Fila label="Tarjeta">{fmt(detalle.ventasTarjeta)}</Fila>
              <Fila label="Transferencia">{fmt(detalle.ventasTransferencia)}</Fila>
              <Fila label={`Total (${detalle.totalTransacciones})`} fuerte>{fmt(detalle.totalVentas)}</Fila>
              {detalle.canceladas > 0 && <Fila label={`Canceladas (${detalle.canceladas})`} tono="text-red-600">{fmt(detalle.totalCancelado)}</Fila>}

              <h4 className="font-semibold text-gray-800 pt-3">Membresías</h4>
              <Fila label="Efectivo">{fmt(detalle.membresiasEfectivo)}</Fila>
              <Fila label="Tarjeta">{fmt(detalle.membresiasTarjeta)}</Fila>
              <Fila label="Transferencia">{fmt(detalle.membresiasTransferencia)}</Fila>
              {detalle.pagosMembresia != null && <Fila label="Pagos">{detalle.pagosMembresia}</Fila>}

              <h4 className="font-semibold text-gray-800 pt-3">Movimientos de efectivo</h4>
              <ListaMovimientos movimientos={detalle.movimientos} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
