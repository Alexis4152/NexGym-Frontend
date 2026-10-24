import { useState } from 'react';
import * as cortesCajaApi from '../../api/cortesCaja';

// Piezas compartidas de la seccion Cortes de caja (homologada con DemoPV/pages/cashcuts).

export const fmt = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const fmtFecha = (d) => (d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export const METODO_CONTEO_LABEL = {
  CAJERO: 'Contado por el cajero',
  ADMIN_PRESENCIAL: 'Contado por un administrador',
  REPORTADO_REMOTO: 'Reportado a distancia',
  NO_CONTADO: 'Sin contar (se entregó el esperado)',
};

export const ESTADO_DIFERENCIA = {
  NINGUNA: { label: 'Sin comparar', color: 'bg-gray-100 text-gray-500' },
  OK: { label: 'Cuadró', color: 'bg-emerald-100 text-emerald-700' },
  DIFERENCIA: { label: 'Con diferencia', color: 'bg-red-100 text-red-700' },
  RESUELTA: { label: 'Resuelta', color: 'bg-blue-100 text-blue-700' },
};

export const TIPO_MOVIMIENTO = {
  GASTO: 'Gasto',
  RETIRO: 'Retiro',
  REEMBOLSO: 'Pago de reembolso',
  APORTE: 'Aporte',
  FONDO: 'Entrada de efectivo',
  PAGO_FALTANTE: 'Pago de faltante',
  PRESTAMO_SALIDA: 'Préstamo a otra caja',
  PRESTAMO_ENTRADA: 'Préstamo de otra caja',
};

export const DESTINO_RETIRO = { DUENO: 'Entregado al dueño', BANCO: 'Depósito bancario', CAJA_FUERTE: 'Caja fuerte' };

export function Fila({ label, children, fuerte, tono }) {
  return (
    <div className={'flex justify-between gap-3 ' + (fuerte ? 'font-semibold text-gray-900 ' : 'text-gray-600 ') + (tono || '')}>
      <span>{label}</span><span className="text-right">{children}</span>
    </div>
  );
}

export function EstadoBadge({ estado }) {
  if (!estado) return null;
  const info = ESTADO_DIFERENCIA[estado] || ESTADO_DIFERENCIA.NINGUNA;
  return <span className={'px-2 py-0.5 rounded-full text-xs whitespace-nowrap ' + info.color}>{info.label}</span>;
}

/** Diferencia con signo y color: positiva = sobró, negativa = faltó. */
export function Diferencia({ valor }) {
  if (valor == null) return <span className="text-gray-400">—</span>;
  const n = Number(valor);
  const color = n === 0 ? 'text-emerald-700' : n > 0 ? 'text-amber-700' : 'text-red-600';
  return <span className={'font-medium ' + color}>{n > 0 ? '+' : ''}{fmt(n)} {n > 0 ? '(sobró)' : n < 0 ? '(faltó)' : ''}</span>;
}

export function ListaMovimientos({ movimientos, vacio = 'Sin movimientos' }) {
  if (!movimientos?.length) return <p className="text-xs text-gray-400">{vacio}</p>;
  return (
    <div className="divide-y divide-gray-100">
      {movimientos.map((m) => (
        <div key={m.id} className="py-1.5 flex justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-gray-800">
              {TIPO_MOVIMIENTO[m.tipo] || m.tipo}
              {m.concepto && <span className="text-gray-500"> · {m.concepto}</span>}
              {m.registradoDespues && <span className="ml-1 text-[10px] px-1.5 rounded bg-amber-100 text-amber-700">registrado después</span>}
            </p>
            <p className="text-[11px] text-gray-400">
              {fmtFecha(m.ocurridoEn || m.createdAt)} · {m.registradoPorNombre}
              {m.destino && ` · ${DESTINO_RETIRO[m.destino]}`}
              {m.personaNombre && m.tipo === 'RETIRO' && ` · ${m.personaNombre}`}
              {m.comprobanteUrl && <> · <a href={m.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">comprobante</a></>}
            </p>
          </div>
          <span className={'whitespace-nowrap font-medium ' + (m.salida ? 'text-red-600' : 'text-emerald-700')}>
            {m.salida ? '−' : '+'}{fmt(m.monto)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Sube un comprobante (imagen/PDF) y devuelve su ruta con onSubido(url). */
export function SubirComprobante({ url, onSubido, etiqueta = 'Comprobante (opcional)' }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  async function elegir(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError('');
    try {
      const { data } = await cortesCajaApi.subirComprobanteCorte(file);
      onSubido(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo subir el archivo');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{etiqueta}</label>
      {url ? (
        <p className="text-xs">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Ver archivo</a>
          <button type="button" className="ml-2 text-red-600 hover:underline" onClick={() => onSubido(null)}>Quitar</button>
        </p>
      ) : (
        <input type="file" accept="image/*,application/pdf" className="text-xs" disabled={subiendo} onChange={elegir} />
      )}
      {subiendo && <p className="text-xs text-gray-400">Subiendo...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Confirmacion reforzada de un monto con diferencia grande (el backend responde
 * data.diferenciaGrande): se pide volver a escribirlo. Uso:
 *   const conf = useConfirmacionMonto();
 *   ... en el catch: if (conf.esDiferenciaGrande(err)) return;
 *   ... al enviar: confirmacionDiferenciaGrande: conf.confirmado(monto)
 *   ... en el form: {conf.campo(monto)}
 * (campo es una funcion que devuelve JSX, no un componente: un componente definido aqui se
 * recrearia en cada render y el input perderia el foco en cada tecla).
 */
export function useConfirmacionMonto() {
  const [pedir, setPedir] = useState(null); // mensaje del backend, o null
  const [reescrito, setReescrito] = useState('');
  return {
    esDiferenciaGrande(err) {
      if (err.response?.data?.data?.diferenciaGrande) {
        setPedir(err.response.data.message);
        setReescrito('');
        return true;
      }
      return false;
    },
    confirmado(monto) {
      return pedir != null && reescrito !== '' && Number(reescrito) === Number(monto);
    },
    reiniciar() { setPedir(null); setReescrito(''); },
    pidiendo: pedir != null,
    campo(monto) {
      if (pedir == null) return null;
      const coincide = reescrito !== '' && Number(reescrito) === Number(monto);
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-2">
          <p className="text-sm text-amber-800">⚠️ {pedir}</p>
          <input type="number" step="0.01" className="input" placeholder="Vuelve a escribir el monto" autoFocus
            value={reescrito} onChange={(e) => setReescrito(e.target.value)} />
          {reescrito !== '' && !coincide && <p className="text-xs text-red-600">No coincide con {fmt(monto)}</p>}
        </div>
      );
    },
  };
}
