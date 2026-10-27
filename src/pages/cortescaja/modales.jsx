import { useEffect, useState } from 'react';
import * as cortesCajaApi from '../../api/cortesCaja';
import * as cajasApi from '../../api/cajasRegistradoras';
import * as cajaLibroApi from '../../api/caja';
import { useNotify } from '../../context/NotifyContext.jsx';
import Modal from '../../components/Modal.jsx';
import {
  fmt, fmtFecha, Fila, ListaMovimientos, SubirComprobante, useConfirmacionMonto,
  METODO_CONTEO_LABEL, DESTINO_RETIRO,
} from './comun.jsx';
import { confirmarAccion, confirmarGuardado } from '../../utils/confirmaciones.js';

const errorDe = (err, def) => err.response?.data?.message || def;

// ------------------------------------------------------------------ abrir: recibir la caja
/**
 * Abrir corte RECIBIENDO una caja: muestra cuanto se debe recibir y por que (lo que entrego el
 * ultimo turno +/- movimientos con la caja cerrada), el cajero cuenta, escribe lo contado y
 * confirma que esta de acuerdo. Si no coincide, la nota es obligatoria.
 */
export function AbrirCorteModal({ caja, onClose, onAbierto }) {
  const { notify, confirmDialog } = useNotify();
  const conf = useConfirmacionMonto();
  const pend = caja.pendiente || {};
  const esperado = pend.monto;
  const [contado, setContado] = useState(esperado != null ? '' : '');
  const [nota, setNota] = useState('');
  const [deAcuerdo, setDeAcuerdo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const difiere = esperado != null && Number(esperado) > 0 && contado !== '' && Number(contado) !== Number(esperado);

  async function enviar(e) {
    e.preventDefault();
    if (contado === '') { notify('Escribe cuánto efectivo contaste', 'error'); return; }
    if (difiere && !nota.trim()) { notify('Lo que contaste no coincide: escribe una nota', 'error'); return; }
    if (!deAcuerdo) { notify('Confirma que contaste el efectivo y estás de acuerdo', 'error'); return; }
    if (!(await confirmarAccion(confirmDialog,
      `¿Abrir tu corte en ${caja.nombre} recibiendo ${fmt(contado)} en efectivo?`,
      { title: 'Confirmar apertura de corte', confirmLabel: 'Sí, abrir' }))) return;
    setEnviando(true);
    try {
      await cortesCajaApi.abrirCorteCaja({
        cajaRegistradoraId: caja.id,
        montoContado: Number(contado),
        deAcuerdo: true,
        confirmacionDiferenciaGrande: conf.confirmado(contado),
        nota: nota.trim() || null,
      });
      notify(`Corte abierto en ${caja.nombre}`, 'success');
      onAbierto();
    } catch (err) {
      if (!conf.esDiferenciaGrande(err)) notify(errorDe(err, 'No se pudo abrir el corte'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Recibir ${caja.nombre}${caja.sucursalNombre ? ` · ${caja.sucursalNombre}` : ''}`} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm space-y-1">
          {esperado == null ? (
            <p className="text-gray-600">Esta caja todavía no tiene entrega previa: lo que cuentes será tu fondo inicial.</p>
          ) : (
            <>
              <Fila label="Debes recibir" fuerte>{fmt(esperado)}</Fila>
              {pend.ultimoCorteUsuarioNombre && (
                <p className="text-xs text-gray-500">
                  Entregó {pend.ultimoCorteUsuarioNombre} ({fmtFecha(pend.ultimoCorteCerradoEn)}): {fmt(pend.ultimoCorteMontoEntregado)}
                  {pend.ultimoCorteMetodoConteo && ` · ${METODO_CONTEO_LABEL[pend.ultimoCorteMetodoConteo]}`}
                </p>
              )}
              {pend.movimientos?.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-600">Movimientos con la caja cerrada:</p>
                  <ListaMovimientos movimientos={pend.movimientos} />
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuánto efectivo contaste? *</label>
          <input type="number" step="0.01" min="0" className="input" value={contado} autoFocus
            onChange={(e) => { setContado(e.target.value); conf.reiniciar(); }} />
          {difiere && (
            <p className="text-xs text-red-600 mt-1">
              Diferencia: {Number(contado) > Number(esperado) ? '+' : ''}{fmt(Number(contado) - Number(esperado))}
            </p>
          )}
        </div>
        {conf.campo(contado)}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota {difiere ? '*' : '(opcional)'}</label>
          <textarea className="input" rows={2} value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder={difiere ? 'Explica la diferencia (un administrador la revisará)' : ''} />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={deAcuerdo} onChange={(e) => setDeAcuerdo(e.target.checked)} />
          Conté el efectivo y estoy de acuerdo con lo que recibo
        </label>
        <button className="btn-primary w-full" disabled={enviando || (conf.pidiendo && !conf.confirmado(contado))}>
          {enviando ? 'Abriendo...' : 'Abrir corte'}
        </button>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ cerrar con arqueo
/** Cierre con arqueo: el cajero cuenta el efectivo; queda en la caja para el siguiente turno. */
export function CerrarCorteModal({ corte, resumen, onClose, onCerrado }) {
  const { notify, confirmDialog } = useNotify();
  const conf = useConfirmacionMonto();
  const [contado, setContado] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ciego = resumen.efectivoEsperado == null;
  const esperado = Number(resumen.efectivoEsperado ?? 0);
  const difiere = !ciego && contado !== '' && Number(contado) !== esperado;

  async function enviar(e) {
    e.preventDefault();
    if (contado === '') { notify('Escribe cuánto efectivo contaste', 'error'); return; }
    if (difiere && !notas.trim()) { notify('El efectivo no cuadra: escribe una nota', 'error'); return; }
    if (!conf.pidiendo) {
      const ok = await confirmDialog(`¿Cerrar el corte con ${fmt(contado)} contados? Ese efectivo queda en la caja para el siguiente turno.`, { danger: true });
      if (!ok) return;
    }
    setEnviando(true);
    try {
      const { data } = await cortesCajaApi.cerrarCorteCaja(corte.id, {
        montoContado: Number(contado),
        notas: notas.trim() || null,
        confirmacionDiferenciaGrande: conf.confirmado(contado),
      });
      onCerrado(data.data);
    } catch (err) {
      if (!conf.esDiferenciaGrande(err)) notify(errorDe(err, 'No se pudo cerrar el corte'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Cerrar corte (arqueo)" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm space-y-1">
          <Fila label="Fondo inicial">{fmt(resumen.montoInicial)}</Fila>
          {!ciego && <Fila label="Ventas en efectivo">{fmt(resumen.ventasEfectivo)}</Fila>}
          {!ciego && <Fila label="Membresías en efectivo">{fmt(resumen.membresiasEfectivo)}</Fila>}
          <Fila label="Entradas">+{fmt(resumen.totalEntradas)}</Fila>
          <Fila label="Gastos">−{fmt(resumen.totalGastos)}</Fila>
          <Fila label="Retiros">−{fmt(resumen.totalRetiros)}</Fila>
          {Number(resumen.totalPrestamosSalida) > 0 && <Fila label="Préstamos a otras cajas">−{fmt(resumen.totalPrestamosSalida)}</Fila>}
          {ciego
            ? <p className="text-xs text-gray-500 pt-1">Conteo ciego: verás cuánto debía haber después de cerrar.</p>
            : <Fila label="Efectivo esperado" fuerte>{fmt(resumen.efectivoEsperado)}</Fila>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado en la caja *</label>
          <input type="number" step="0.01" min="0" className="input" value={contado} autoFocus
            onChange={(e) => { setContado(e.target.value); conf.reiniciar(); }} />
          {difiere && <p className="text-xs text-red-600 mt-1">Diferencia: {Number(contado) > esperado ? '+' : ''}{fmt(Number(contado) - esperado)}</p>}
        </div>
        {conf.campo(contado)}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas {difiere ? '*' : '(opcional)'}</label>
          <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <button className="btn-danger w-full" disabled={enviando || (conf.pidiendo && !conf.confirmado(contado))}>
          {enviando ? 'Cerrando...' : 'Cerrar corte'}
        </button>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ movimientos del turno
const TIPOS = {
  salida: [
    { value: 'GASTO', label: 'Gasto' },
    { value: 'RETIRO', label: 'Retiro (solo administradores)', soloAdmin: true },
    { value: 'PRESTAMO_SALIDA', label: 'Préstamo a otra caja' },
  ],
  entrada: [
    { value: 'FONDO', label: 'Entrada de cambio / fondo extra' },
    { value: 'PRESTAMO_ENTRADA', label: 'Préstamo recibido de otra caja' },
  ],
};

/** Registrar una entrada o salida de efectivo dentro del corte abierto. */
export function MovimientoCorteModal({ corte, grupo, esAdmin, cajas, onClose, onRegistrado }) {
  const { notify, confirmDialog } = useNotify();
  const opciones = TIPOS[grupo].filter((t) => !t.soloAdmin || esAdmin);
  const [form, setForm] = useState({ tipo: opciones[0].value, monto: '', concepto: '', categoriaId: '', destino: '', personaId: '', cajaContraparteId: '', referencia: '', comprobanteUrl: null });
  const [categorias, setCategorias] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const otrasCajas = (cajas || []).filter((c) => c.id !== corte.cajaId);

  useEffect(() => {
    cajaLibroApi.listCategoriasMovimiento('EGRESO').then(({ data }) => setCategorias(data.data)).catch(() => setCategorias([]));
    if (esAdmin) cajasApi.listPersonasCaja().then(({ data }) => setPersonas(data.data)).catch(() => {});
  }, [esAdmin]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) { notify('Captura un monto mayor a cero', 'error'); return; }
    const tipoLabel = opciones.find((t) => t.value === form.tipo)?.label.replace(/ \(.*\)$/, '') || form.tipo;
    if (!(await confirmarAccion(confirmDialog, `¿Registrar ${tipoLabel.toLowerCase()} por ${fmt(form.monto)}?`,
      { title: 'Confirmar movimiento de efectivo', confirmLabel: 'Sí, registrar' }))) return;
    setEnviando(true);
    try {
      await cortesCajaApi.registrarMovimientoCorte(corte.id, {
        tipo: form.tipo,
        monto: Number(form.monto),
        concepto: form.concepto.trim() || null,
        categoriaId: form.tipo === 'GASTO' ? (form.categoriaId ? Number(form.categoriaId) : null) : null,
        destino: form.tipo === 'RETIRO' ? form.destino || null : null,
        personaId: form.tipo === 'RETIRO' && form.personaId ? Number(form.personaId) : null,
        cajaContraparteId: form.tipo.startsWith('PRESTAMO') && form.cajaContraparteId ? Number(form.cajaContraparteId) : null,
        referencia: form.referencia.trim() || null,
        comprobanteUrl: form.comprobanteUrl,
      });
      notify('Movimiento registrado', 'success');
      onRegistrado();
    } catch (err) {
      notify(errorDe(err, 'No se pudo registrar el movimiento'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={grupo === 'salida' ? 'Registrar salida de efectivo' : 'Registrar entrada de efectivo'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select className="input" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {opciones.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
          <input type="number" step="0.01" min="0" className="input" value={form.monto} onChange={(e) => set('monto', e.target.value)} autoFocus />
        </div>
        {form.tipo === 'GASTO' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
              <input className="input" maxLength={150} value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej. garrafones de agua" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría del gasto *</label>
              <select className="input" value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
                <option value="">Selecciona...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">También se registra como egreso en Caja. Sin comprobante queda pendiente de aprobación.</p>
            </div>
            <SubirComprobante url={form.comprobanteUrl} onSubido={(u) => set('comprobanteUrl', u)} />
          </>
        )}
        {form.tipo === 'RETIRO' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
              <select className="input" value={form.destino} onChange={(e) => set('destino', e.target.value)}>
                <option value="">Selecciona...</option>
                {Object.entries(DESTINO_RETIRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién se lleva el dinero?</label>
              <select className="input" value={form.personaId} onChange={(e) => set('personaId', e.target.value)}>
                <option value="">Yo</option>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (opcional)</label>
              <input className="input" maxLength={100} value={form.referencia} onChange={(e) => set('referencia', e.target.value)} placeholder="Ej. folio del depósito" />
            </div>
          </>
        )}
        {form.tipo.startsWith('PRESTAMO') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{form.tipo === 'PRESTAMO_SALIDA' ? 'Caja a la que prestas' : 'Caja que te presta'} *</label>
            <select className="input" value={form.cajaContraparteId} onChange={(e) => set('cajaContraparteId', e.target.value)}>
              <option value="">Selecciona...</option>
              {otrasCajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.sucursalNombre ? ` · ${c.sucursalNombre}` : ''}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">La otra caja registra su lado por separado.</p>
          </div>
        )}
        {form.tipo === 'FONDO' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
            <input className="input" maxLength={150} value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej. cambio en monedas" />
          </div>
        )}
        <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Registrando...' : 'Registrar'}</button>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ cierre forzado
/** Forzar el cierre del corte de otro (se fue sin cerrar), indicando como se conto. */
export function ForzarCierreModal({ corte, onClose, onCerrado }) {
  const { notify, confirmDialog } = useNotify();
  const [form, setForm] = useState({ metodoConteo: 'ADMIN_PRESENCIAL', montoContado: '', reportadoPorId: '', evidenciaUrl: null, motivo: '' });
  const [personas, setPersonas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { cajasApi.listPersonasCaja().then(({ data }) => setPersonas(data.data)).catch(() => {}); }, []);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const pideMonto = form.metodoConteo !== 'NO_CONTADO';

  async function enviar(e) {
    e.preventDefault();
    if (!form.motivo.trim()) { notify('Escribe el motivo', 'error'); return; }
    if (pideMonto && form.montoContado === '') { notify('Captura cuánto efectivo se contó', 'error'); return; }
    const ok = await confirmDialog(`¿Forzar el cierre del corte de ${corte.usuarioNombre}?`, { danger: true });
    if (!ok) return;
    setEnviando(true);
    try {
      await cortesCajaApi.forzarCierreCorte(corte.corteId ?? corte.id, {
        metodoConteo: form.metodoConteo,
        montoContado: pideMonto ? Number(form.montoContado) : null,
        reportadoPorId: form.metodoConteo === 'REPORTADO_REMOTO' && form.reportadoPorId ? Number(form.reportadoPorId) : null,
        evidenciaUrl: form.evidenciaUrl,
        motivo: form.motivo.trim(),
      });
      notify('Corte cerrado', 'success');
      onCerrado();
    } catch (err) {
      notify(errorDe(err, 'No se pudo cerrar el corte'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Forzar cierre · ${corte.usuarioNombre}`} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">¿Cómo se contó el efectivo?</label>
          <select className="input" value={form.metodoConteo} onChange={(e) => set('metodoConteo', e.target.value)}>
            <option value="ADMIN_PRESENCIAL">Lo conté yo en persona</option>
            <option value="REPORTADO_REMOTO">Me lo reportó el cajero a distancia</option>
            <option value="NO_CONTADO">Nadie lo contó (se entrega el esperado)</option>
          </select>
        </div>
        {pideMonto && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado *</label>
            <input type="number" step="0.01" min="0" className="input" value={form.montoContado} onChange={(e) => set('montoContado', e.target.value)} />
          </div>
        )}
        {form.metodoConteo === 'REPORTADO_REMOTO' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién lo reportó? *</label>
              <select className="input" value={form.reportadoPorId} onChange={(e) => set('reportadoPorId', e.target.value)}>
                <option value="">Selecciona...</option>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <SubirComprobante etiqueta="Evidencia (foto del conteo, opcional)" url={form.evidenciaUrl} onSubido={(u) => set('evidenciaUrl', u)} />
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
          <input className="input" maxLength={200} value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Ej. el cajero se fue sin cerrar" />
        </div>
        <button className="btn-danger w-full" disabled={enviando}>{enviando ? 'Cerrando...' : 'Forzar cierre'}</button>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ caja cerrada
/** Retirar o agregar efectivo con la caja cerrada (entre turnos). */
export function MovimientoCajaCerradaModal({ caja, tipo, onClose, onRegistrado }) {
  const { notify, confirmDialog } = useNotify();
  const actual = Number(caja.pendiente?.monto ?? 0);
  const [form, setForm] = useState({ monto: '', concepto: '', destino: '', referencia: '', contar: false, restanteContado: '' });
  const [enviando, setEnviando] = useState(false);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const restante = tipo === 'RETIRO' ? actual - Number(form.monto || 0) : actual + Number(form.monto || 0);

  async function enviar(e) {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) { notify('Captura un monto mayor a cero', 'error'); return; }
    if (!(await confirmarAccion(confirmDialog,
      `¿${tipo === 'RETIRO' ? 'Retirar' : 'Agregar'} ${fmt(form.monto)} ${tipo === 'RETIRO' ? 'de' : 'a'} ${caja.nombre}? Quedarán ${fmt(restante)}.`,
      { title: 'Confirmar movimiento de efectivo', confirmLabel: tipo === 'RETIRO' ? 'Sí, retirar' : 'Sí, agregar' }))) return;
    setEnviando(true);
    try {
      await cajasApi.movimientoCajaCerrada(caja.id, {
        tipo,
        monto: Number(form.monto),
        concepto: form.concepto.trim() || null,
        destino: tipo === 'RETIRO' ? form.destino || null : null,
        referencia: form.referencia.trim() || null,
        restanteContado: form.contar && form.restanteContado !== '' ? Number(form.restanteContado) : null,
      });
      notify('Movimiento registrado', 'success');
      onRegistrado();
    } catch (err) {
      notify(errorDe(err, 'No se pudo registrar'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`${tipo === 'RETIRO' ? 'Retirar de' : 'Agregar a'} ${caja.nombre}`} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-sm text-gray-600">Hay {fmt(actual)} pendientes de entregar al siguiente turno.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
          <input type="number" step="0.01" min="0" className="input" value={form.monto} onChange={(e) => set('monto', e.target.value)} autoFocus />
          {form.monto && <p className="text-xs text-gray-500 mt-1">Quedarán {fmt(restante)}</p>}
        </div>
        {tipo === 'RETIRO' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
            <select className="input" value={form.destino} onChange={(e) => set('destino', e.target.value)}>
              <option value="">Selecciona...</option>
              {Object.entries(DESTINO_RETIRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
          <input className="input" maxLength={150} value={form.concepto} onChange={(e) => set('concepto', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.contar} onChange={(e) => set('contar', e.target.checked)} />
          Conté lo que queda en la caja
        </label>
        {form.contar && (
          <input type="number" step="0.01" min="0" className="input" placeholder="Lo que quedó contado" value={form.restanteContado}
            onChange={(e) => set('restanteContado', e.target.value)} />
        )}
        <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Registrando...' : 'Registrar'}</button>
      </form>
    </Modal>
  );
}

/** Alta o edicion de una caja. */
export function CajaFormModal({ caja, sucursales, onClose, onGuardado }) {
  const { notify, confirmDialog } = useNotify();
  const [nombre, setNombre] = useState(caja?.nombre || '');
  const [sucursalId, setSucursalId] = useState(caja?.sucursalId || (sucursales.length === 1 ? sucursales[0].id : ''));
  const [activo, setActivo] = useState(caja ? caja.activo : true);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!(await confirmarGuardado(confirmDialog, { editando: !!caja, que: 'la caja', nombre }))) return;
    setEnviando(true);
    try {
      if (caja) await cajasApi.updateCajaRegistradora(caja.id, { nombre, activo });
      else await cajasApi.createCajaRegistradora({ nombre, sucursalId: sucursalId ? Number(sucursalId) : null });
      notify(caja ? 'Caja actualizada' : 'Caja creada', 'success');
      onGuardado();
    } catch (err) {
      notify(errorDe(err, 'No se pudo guardar la caja'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={caja ? `Editar ${caja.nombre}` : 'Nueva caja'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input className="input" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Caja 2" />
        </div>
        {!caja && sucursales.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
            <select className="input" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Selecciona...</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
        {caja && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Caja activa
          </label>
        )}
        <button className="btn-primary w-full" disabled={enviando || !nombre.trim()}>{enviando ? 'Guardando...' : 'Guardar'}</button>
      </form>
    </Modal>
  );
}
