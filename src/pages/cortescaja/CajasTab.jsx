import { useEffect, useState } from 'react';
import * as cajasApi from '../../api/cajasRegistradoras';
import * as sucursalesApi from '../../api/sucursales';
import { useNotify } from '../../context/NotifyContext.jsx';
import { fmt, fmtFecha, ListaMovimientos, METODO_CONTEO_LABEL } from './comun.jsx';
import { ForzarCierreModal, MovimientoCajaCerradaModal, CajaFormModal } from './modales.jsx';

// Pestaña "Cajas" (Encargado/Dueño): una tarjeta por caja con su estado -- en uso (cajero,
// desde cuando, efectivo esperado y "Forzar cierre") o cerrada (lo que recibira el siguiente
// turno y por que, "Retirar" y "Agregar efectivo"). Homologada con DemoPV#RegistersTab.
export default function CajasTab({ onCambio }) {
  const { notify } = useNotify();
  const [cajas, setCajas] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [forzar, setForzar] = useState(null);
  const [movCerrada, setMovCerrada] = useState(null); // { caja, tipo }
  const [editar, setEditar] = useState(null); // caja | 'nueva'

  useEffect(() => {
    cargar();
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data)).catch(() => {});
  }, []);

  function cargar() {
    cajasApi.listCajasRegistradoras()
      .then(({ data }) => setCajas(data.data))
      .catch((err) => { notify(err.response?.data?.message || 'No se pudieron cargar las cajas', 'error'); setCajas([]); });
  }

  function despuesDeCambio() {
    cargar();
    onCambio?.();
  }

  if (cajas === null) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary text-sm" onClick={() => setEditar('nueva')}>+ Nueva caja</button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cajas.map((c) => (
          <div key={c.id} className={'card space-y-2 ' + (c.activo ? '' : 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800">{c.nombre}</p>
                {c.sucursalNombre && <p className="text-xs text-gray-400">{c.sucursalNombre}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={'px-2 py-0.5 rounded-full text-xs ' + (!c.activo ? 'bg-gray-100 text-gray-500'
                  : c.corteAbierto ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                  {!c.activo ? 'Inactiva' : c.corteAbierto ? 'En uso' : 'Cerrada'}
                </span>
                <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setEditar(c)}>Editar</button>
              </div>
            </div>

            {c.corteAbierto ? (
              <div className="text-sm space-y-1">
                <p className="text-gray-700">{c.corteAbierto.usuarioNombre} · corte #{c.corteAbierto.corteId}</p>
                <p className="text-xs text-gray-400">Desde {fmtFecha(c.corteAbierto.abiertoEn)}</p>
                {c.corteAbierto.efectivoEsperado != null && (
                  <p className="text-gray-700">Efectivo esperado: <strong>{fmt(c.corteAbierto.efectivoEsperado)}</strong></p>
                )}
                <button type="button" className="btn-danger text-xs w-full mt-2"
                  onClick={() => setForzar({ ...c.corteAbierto, cajaNombre: c.nombre })}>
                  Forzar cierre
                </button>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <p className="text-gray-700">
                  Entrega pendiente: <strong>{c.pendiente?.monto != null ? fmt(c.pendiente.monto) : 'sin entrega previa'}</strong>
                </p>
                {c.pendiente?.ultimoCorteUsuarioNombre && (
                  <p className="text-xs text-gray-500">
                    Último turno: {c.pendiente.ultimoCorteUsuarioNombre} ({fmtFecha(c.pendiente.ultimoCorteCerradoEn)}) entregó {fmt(c.pendiente.ultimoCorteMontoEntregado)}
                  </p>
                )}
                {c.pendiente?.metodoConteo && (
                  <p className="text-xs text-gray-400">
                    {METODO_CONTEO_LABEL[c.pendiente.metodoConteo]}{c.pendiente.contadoPorNombre ? ` · ${c.pendiente.contadoPorNombre}` : ''}
                  </p>
                )}
                {c.pendiente?.movimientos?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-600">Movimientos con la caja cerrada:</p>
                    <ListaMovimientos movimientos={c.pendiente.movimientos} />
                  </div>
                )}
                {c.activo && (
                  <div className="flex gap-2 pt-2">
                    <button type="button" className="btn-secondary text-xs flex-1" disabled={!c.pendiente?.monto}
                      onClick={() => setMovCerrada({ caja: c, tipo: 'RETIRO' })}>Retirar</button>
                    <button type="button" className="btn-secondary text-xs flex-1"
                      onClick={() => setMovCerrada({ caja: c, tipo: 'FONDO' })}>Agregar efectivo</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {forzar && <ForzarCierreModal corte={forzar} onClose={() => setForzar(null)} onCerrado={() => { setForzar(null); despuesDeCambio(); }} />}
      {movCerrada && (
        <MovimientoCajaCerradaModal caja={movCerrada.caja} tipo={movCerrada.tipo}
          onClose={() => setMovCerrada(null)} onRegistrado={() => { setMovCerrada(null); despuesDeCambio(); }} />
      )}
      {editar && (
        <CajaFormModal caja={editar === 'nueva' ? null : editar} sucursales={sucursales}
          onClose={() => setEditar(null)} onGuardado={() => { setEditar(null); despuesDeCambio(); }} />
      )}
    </div>
  );
}
