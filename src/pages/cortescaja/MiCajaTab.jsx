import { useEffect, useState } from 'react';
import * as cortesCajaApi from '../../api/cortesCaja';
import * as cajasApi from '../../api/cajasRegistradoras';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotify } from '../../context/NotifyContext.jsx';
import { fmt, fmtFecha, Fila, ListaMovimientos, EstadoBadge, Diferencia } from './comun.jsx';
import { AbrirCorteModal, CerrarCorteModal, MovimientoCorteModal } from './modales.jsx';

// Pestaña "Mi caja": el corte del usuario en sesion. Sin corte abierto, ofrece abrir uno
// (elegir caja -> recibirla contando el efectivo). Con corte abierto: resumen en vivo (fondo,
// ventas y membresias por metodo, entradas, salidas, efectivo esperado), sus movimientos y las
// acciones: registrar entrada/salida y cerrar con arqueo. Homologada con DemoPV#MyCashTab.
export default function MiCajaTab({ onCambio }) {
  const { isSuperAdmin, isEncargadoOSuperior, hasPermiso } = useAuth();
  const { notify } = useNotify();
  const esAdmin = isSuperAdmin || isEncargadoOSuperior;
  const [corte, setCorte] = useState(undefined); // undefined = cargando, null = sin corte
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [abrirEn, setAbrirEn] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [movGrupo, setMovGrupo] = useState(null); // 'entrada' | 'salida'
  const [recienCerrado, setRecienCerrado] = useState(null);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    try {
      const [{ data: c }, { data: cj }] = await Promise.all([cortesCajaApi.getCorteAbierto(), cajasApi.listCajasRegistradoras()]);
      setCajas(cj.data);
      setCorte(c.data);
      if (c.data) {
        const [{ data: r }, { data: m }] = await Promise.all([
          cortesCajaApi.getCorteCajaResumen(c.data.id), cortesCajaApi.listMovimientosCorte(c.data.id),
        ]);
        setResumen(r.data);
        setMovimientos(m.data);
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cargar tu caja', 'error');
      setCorte(null);
    }
  }

  function despuesDeCambio() {
    cargar();
    onCambio?.();
  }

  if (corte === undefined) return <p className="text-sm text-gray-400">Cargando...</p>;

  // ---------------------------------------------------------------- sin corte abierto
  if (!corte) {
    const disponibles = cajas.filter((c) => c.activo);
    return (
      <div className="space-y-4">
        {recienCerrado && (
          <div className="card border border-emerald-200 bg-emerald-50 text-sm space-y-1">
            <p className="font-semibold text-emerald-800">✅ Corte cerrado</p>
            {recienCerrado.montoFinal != null && <Fila label="Efectivo esperado">{fmt(recienCerrado.montoFinal)}</Fila>}
            <Fila label="Efectivo contado">{fmt(recienCerrado.montoContado)}</Fila>
            <Fila label="Diferencia"><Diferencia valor={recienCerrado.diferenciaEfectivo} /></Fila>
            <p className="text-xs text-emerald-700 pt-1">Lo contado quedó en {recienCerrado.cajaNombre} para el siguiente turno.</p>
          </div>
        )}
        <div className="card">
          <p className="text-sm text-gray-600 mb-3">No tienes ningún corte abierto. Elige la caja que vas a recibir:</p>
          {disponibles.length === 0 ? (
            <p className="text-sm text-gray-400">No hay cajas activas en tu sucursal.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {disponibles.map((c) => {
                const enUso = !!c.corteAbierto;
                return (
                  <div key={c.id} className={'border rounded-lg p-3 ' + (enUso ? 'border-gray-200 bg-gray-50' : 'border-brand-200')}>
                    <p className="font-semibold text-gray-800">{c.nombre}</p>
                    {c.sucursalNombre && <p className="text-xs text-gray-400">{c.sucursalNombre}</p>}
                    {enUso ? (
                      <p className="text-xs text-gray-500 mt-2">En uso por {c.corteAbierto.usuarioNombre}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        {c.pendiente?.monto != null ? <>Recibirás <strong>{fmt(c.pendiente.monto)}</strong></> : 'Sin entrega previa'}
                      </p>
                    )}
                    <button type="button" className="btn-primary w-full text-sm mt-3" disabled={enUso || !hasPermiso('CAJA_ABRIR')}
                      onClick={() => { setRecienCerrado(null); setAbrirEn(c); }}>
                      {enUso ? 'Ocupada' : 'Recibir y abrir corte'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {abrirEn && (
          <AbrirCorteModal caja={abrirEn} onClose={() => setAbrirEn(null)} onAbierto={() => { setAbrirEn(null); despuesDeCambio(); }} />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- corte abierto
  const ciego = resumen && resumen.efectivoEsperado == null;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Corte #{corte.id} abierto desde {fmtFecha(corte.abiertoEn)}</p>
          <p className="font-semibold text-gray-800">{corte.cajaNombre || 'Caja'}{corte.sucursalNombre ? ` · ${corte.sucursalNombre}` : ''}</p>
          {corte.estadoEntrega && corte.estadoEntrega !== 'NINGUNA' && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              Recepción: <EstadoBadge estado={corte.estadoEntrega} />
              {corte.diferenciaEntrega != null && Number(corte.diferenciaEntrega) !== 0 && <Diferencia valor={corte.diferenciaEntrega} />}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => setMovGrupo('entrada')}>+ Entrada</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => setMovGrupo('salida')}>− Salida</button>
          <button type="button" className="btn-danger text-sm" disabled={!hasPermiso('CAJA_CERRAR')} onClick={() => setCerrando(true)}>Cerrar corte</button>
        </div>
      </div>

      {resumen && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card text-sm space-y-1">
            <h3 className="font-semibold text-gray-800 mb-2">💵 Efectivo en caja</h3>
            <Fila label="Fondo inicial">{fmt(resumen.montoInicial)}</Fila>
            {!ciego && <Fila label="Ventas en efectivo">+{fmt(resumen.ventasEfectivo)}</Fila>}
            {!ciego && <Fila label="Membresías en efectivo">+{fmt(resumen.membresiasEfectivo)}</Fila>}
            <Fila label="Entradas">+{fmt(resumen.totalEntradas)}</Fila>
            <Fila label="Gastos">−{fmt(resumen.totalGastos)}</Fila>
            <Fila label="Retiros">−{fmt(resumen.totalRetiros)}</Fila>
            {Number(resumen.totalPrestamosSalida) > 0 && <Fila label="Préstamos a otras cajas">−{fmt(resumen.totalPrestamosSalida)}</Fila>}
            <div className="border-t border-gray-100 pt-1">
              {ciego
                ? <p className="text-xs text-gray-500">Conteo ciego: verás el efectivo esperado al cerrar.</p>
                : <Fila label="Efectivo esperado" fuerte>{fmt(resumen.efectivoEsperado)}</Fila>}
            </div>
          </div>
          <div className="card text-sm space-y-1">
            <h3 className="font-semibold text-gray-800 mb-2">🛍️ Ventas de tienda</h3>
            {!ciego && <Fila label="Efectivo">{fmt(resumen.ventasEfectivo)}</Fila>}
            <Fila label="Tarjeta">{fmt(resumen.ventasTarjeta)}</Fila>
            <Fila label="Transferencia">{fmt(resumen.ventasTransferencia)}</Fila>
            {Number(resumen.ventasOtro) > 0 && <Fila label="Otro">{fmt(resumen.ventasOtro)}</Fila>}
            {!ciego && <Fila label={`Total (${resumen.totalTransacciones} ventas)`} fuerte>{fmt(resumen.totalVentas)}</Fila>}
            {resumen.canceladas > 0 && <Fila label={`Canceladas (${resumen.canceladas})`} tono="text-red-600">{fmt(resumen.totalCancelado)}</Fila>}
          </div>
          <div className="card text-sm space-y-1">
            <h3 className="font-semibold text-gray-800 mb-2">🎫 Membresías cobradas</h3>
            {!ciego && <Fila label="Efectivo">{fmt(resumen.membresiasEfectivo)}</Fila>}
            <Fila label="Tarjeta">{fmt(resumen.membresiasTarjeta)}</Fila>
            <Fila label="Transferencia">{fmt(resumen.membresiasTransferencia)}</Fila>
            {Number(resumen.membresiasOtro) > 0 && <Fila label="Otro">{fmt(resumen.membresiasOtro)}</Fila>}
            {!ciego && <Fila label={`Total (${resumen.pagosMembresia} pagos)`} fuerte>{fmt(resumen.totalMembresias)}</Fila>}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-2">Movimientos del turno</h3>
        <ListaMovimientos movimientos={movimientos} vacio="Sin entradas ni salidas de efectivo en este turno." />
      </div>

      {movGrupo && (
        <MovimientoCorteModal corte={corte} grupo={movGrupo} esAdmin={esAdmin} cajas={cajas}
          onClose={() => setMovGrupo(null)} onRegistrado={() => { setMovGrupo(null); despuesDeCambio(); }} />
      )}
      {cerrando && resumen && (
        <CerrarCorteModal corte={corte} resumen={resumen} onClose={() => setCerrando(false)}
          onCerrado={(cerrado) => { setCerrando(false); setRecienCerrado(cerrado); despuesDeCambio(); }} />
      )}
    </div>
  );
}
