import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as alumnosApi from '../api/alumnos';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { generarQrDataUrl } from '../utils/qr.js';

const ESTADO_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDA: 'bg-orange-100 text-orange-700',
  VENCIDA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-600',
};
const INDICADOR_LABEL = {
  PROXIMA_A_VENCER: 'Próxima a vencer',
  SALDO_PENDIENTE: 'Saldo pendiente',
  PAGO_VENCIDO: 'Pago vencido',
  CLASES_POR_AGOTARSE: 'Clases por agotarse',
  AGOTADA: 'Agotada',
};
const INDICADOR_COLOR = {
  PROXIMA_A_VENCER: 'bg-amber-100 text-amber-700',
  SALDO_PENDIENTE: 'bg-red-100 text-red-700',
  PAGO_VENCIDO: 'bg-red-200 text-red-800',
  CLASES_POR_AGOTARSE: 'bg-amber-100 text-amber-700',
  AGOTADA: 'bg-gray-200 text-gray-700',
};

export default function AlumnoDetalle() {
  const { id } = useParams();
  const [alumno, setAlumno] = useState(null);
  const [membresias, setMembresias] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [modalPago, setModalPago] = useState(false);
  const [pagoForm, setPagoForm] = useState({ monto: '', metodoPago: 'EFECTIVO' });
  const [modalRenovar, setModalRenovar] = useState(false);
  const [renovarForm, setRenovarForm] = useState({ planId: '', disciplinaIds: [], descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO' });
  const [modalMotivo, setModalMotivo] = useState(null); // { accion: 'suspender'|'cancelar', motivo: '' }
  const [qrImagen, setQrImagen] = useState(null);
  const [regenerandoQr, setRegenerandoQr] = useState(false);
  const { notify, confirmDialog } = useNotify();
  const { hasPermiso } = useAuth();
  const puedeEditar = hasPermiso('ALUMNOS_EDITAR');
  const pagosRef = useRef(null);

  function verPagos(m) {
    setSeleccionada(m);
    pagosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    cargarAlumno();
    cargarMembresias();
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, [id]);

  useEffect(() => {
    if (alumno?.codigoQr) generarQrDataUrl(alumno.codigoQr).then(setQrImagen);
    else setQrImagen(null);
  }, [alumno?.codigoQr]);

  useEffect(() => {
    if (seleccionada) cargarPagos(seleccionada.id);
  }, [seleccionada?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function cargarAlumno() {
    alumnosApi.getAlumno(id).then(({ data }) => setAlumno(data.data));
  }

  function cargarMembresias() {
    membresiasApi.listMembresiasPorAlumno(id, 0, 50).then(({ data }) => {
      const lista = [...data.data.content].sort((a, b) => b.id - a.id);
      setMembresias(lista);
      const actual = lista.find((m) => m.estado !== 'CANCELADA') || lista[0] || null;
      setSeleccionada((prev) => (prev ? lista.find((m) => m.id === prev.id) || actual : actual));
    });
  }

  function cargarPagos(membresiaId) {
    membresiasApi.listPagosMembresia(membresiaId).then(({ data }) => setPagos(data.data));
  }

  const planSeleccionadoRenovar = planes.find((p) => String(p.id) === String(renovarForm.planId));

  async function handleRegistrarPago(e) {
    e.preventDefault();
    try {
      await membresiasApi.registrarPagoMembresia(seleccionada.id, { monto: Number(pagoForm.monto), metodoPago: pagoForm.metodoPago });
      notify('Pago registrado', 'success');
      setModalPago(false);
      setPagoForm({ monto: '', metodoPago: 'EFECTIVO' });
      cargarMembresias();
      cargarPagos(seleccionada.id);
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar el pago', 'error');
    }
  }

  async function handleCancelarPago(pagoId) {
    const ok = await confirmDialog('¿Cancelar este pago? Se anulará su movimiento en Caja.', { danger: true });
    if (!ok) return;
    const motivo = window.prompt('Motivo de la cancelación del pago:');
    if (!motivo) return;
    try {
      await membresiasApi.cancelarPagoMembresia(seleccionada.id, pagoId, motivo);
      notify('Pago cancelado', 'success');
      cargarMembresias();
      cargarPagos(seleccionada.id);
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar el pago', 'error');
    }
  }

  function abrirRenovar() {
    setRenovarForm({
      planId: seleccionada.planId, disciplinaIds: seleccionada.disciplinaIds || [],
      descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO',
    });
    setModalRenovar(true);
  }

  function toggleDisciplinaRenovar(disId) {
    setRenovarForm((f) => {
      const max = planSeleccionadoRenovar?.maxDisciplinasSeleccionables || 1;
      const yaEsta = f.disciplinaIds.includes(disId);
      if (yaEsta) return { ...f, disciplinaIds: f.disciplinaIds.filter((x) => x !== disId) };
      if (f.disciplinaIds.length >= max) return f;
      return { ...f, disciplinaIds: [...f.disciplinaIds, disId] };
    });
  }

  async function handleRenovar(e) {
    e.preventDefault();
    try {
      await membresiasApi.renovarMembresia(seleccionada.id, {
        planId: renovarForm.planId,
        disciplinaIds: renovarForm.disciplinaIds,
        descuento: Number(renovarForm.descuento || 0),
        montoPagoInicial: renovarForm.montoPagoInicial ? Number(renovarForm.montoPagoInicial) : null,
        metodoPago: renovarForm.metodoPago,
      });
      notify('Membresía renovada', 'success');
      setModalRenovar(false);
      cargarMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo renovar la membresía', 'error');
    }
  }

  async function handleReanudar() {
    try {
      await membresiasApi.reanudarMembresia(seleccionada.id);
      notify('Membresía reanudada', 'success');
      cargarMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reanudar', 'error');
    }
  }

  async function handleMotivoSubmit(e) {
    e.preventDefault();
    const { accion, motivo } = modalMotivo;
    if (!motivo.trim()) {
      notify('El motivo es obligatorio', 'error');
      return;
    }
    try {
      if (accion === 'suspender') {
        await membresiasApi.suspenderMembresia(seleccionada.id, motivo);
        notify('Membresía suspendida', 'success');
      } else {
        await membresiasApi.cancelarMembresia(seleccionada.id, motivo);
        notify('Membresía cancelada', 'success');
      }
      setModalMotivo(null);
      cargarMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo completar la acción', 'error');
    }
  }

  async function handleRegenerarQr() {
    const ok = await confirmDialog('¿Regenerar el codigo QR? El anterior dejara de funcionar de inmediato.', { danger: true });
    if (!ok) return;
    setRegenerandoQr(true);
    try {
      const { data } = await alumnosApi.regenerarQrAlumno(id);
      setAlumno(data.data);
      notify('QR regenerado', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo regenerar el QR', 'error');
    } finally {
      setRegenerandoQr(false);
    }
  }

  function handleImprimirQr() {
    const ventana = window.open('', '_blank', 'width=400,height=500');
    ventana.document.write(`
      <html><head><title>QR - ${alumno.nombre}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:20px;">
        <h3>${alumno.nombre}</h3>
        <img src="${qrImagen}" style="width:240px;height:240px;" />
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    ventana.document.close();
  }

  if (!alumno) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div>
      <Link to="/alumnos" className="text-sm text-brand-600 hover:underline">
        ← Volver a alumnos
      </Link>

      <div className="card mt-4 mb-6 flex flex-col sm:flex-row gap-4 sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{alumno.nombre}</h1>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 mt-3">
            <p>Telefono: {alumno.telefono || '-'}</p>
            <p>Correo: {alumno.email || '-'}</p>
            <p>Contacto de emergencia: {alumno.contactoEmergenciaNombre || '-'} {alumno.contactoEmergenciaTelefono ? `(${alumno.contactoEmergenciaTelefono})` : ''}</p>
            <p>Ingreso: {alumno.fechaIngreso}</p>
            <p>Disciplinas de interés: {alumno.disciplinaNombres?.join(', ') || '-'}</p>
          </div>
          {alumno.observaciones && <p className="text-sm text-gray-500 mt-3 italic">{alumno.observaciones}</p>}
        </div>

        {qrImagen && (
          <div className="text-center shrink-0 self-center sm:self-start">
            <img src={qrImagen} alt="QR del alumno" className="w-32 h-32 mx-auto border border-gray-200 rounded-lg" />
            <p className="text-xs text-gray-400 mt-1">QR de asistencia</p>
            <div className="flex gap-2 mt-2">
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={handleImprimirQr}>🖨️ Imprimir</button>
              {puedeEditar && (
                <button type="button" className="text-xs text-gray-500 hover:underline" disabled={regenerandoQr} onClick={handleRegenerarQr}>
                  {regenerandoQr ? 'Regenerando...' : '↻ Regenerar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {seleccionada && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-semibold text-gray-800">Membresía actual</h2>
            <div className="flex gap-2 flex-wrap">
              {seleccionada.estado !== 'CANCELADA' && (
                <button className="btn-secondary text-sm" onClick={() => setModalPago(true)}>Registrar pago</button>
              )}
              {seleccionada.estado !== 'CANCELADA' && (
                <button className="btn-secondary text-sm" onClick={abrirRenovar}>Renovar</button>
              )}
              {seleccionada.estado === 'SUSPENDIDA' ? (
                <button className="btn-secondary text-sm" onClick={handleReanudar}>Reanudar</button>
              ) : seleccionada.estado !== 'CANCELADA' && seleccionada.estado !== 'VENCIDA' ? (
                <button className="btn-secondary text-sm" onClick={() => setModalMotivo({ accion: 'suspender', motivo: '' })}>Suspender</button>
              ) : null}
              {seleccionada.estado !== 'CANCELADA' && (
                <button className="text-red-600 text-sm hover:underline" onClick={() => setModalMotivo({ accion: 'cancelar', motivo: '' })}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Plan</p>
              <p className="font-medium text-gray-800">{seleccionada.planNombre}</p>
              <p className="text-gray-500 text-xs">{seleccionada.disciplinaNombres?.join(', ') || 'Todas las disciplinas'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Vigencia</p>
              <p className="text-gray-700">{seleccionada.fechaInicio} — {seleccionada.fechaFin || 'sin fecha (por clases)'}</p>
              <span className={'inline-block mt-1 px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[seleccionada.estado]}>{seleccionada.estado}</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Precio contratado</p>
              <p className="text-gray-700">${Number(seleccionada.precioFinal).toFixed(2)} {seleccionada.descuento > 0 && (
                <span className="text-xs text-gray-400">(desc. ${Number(seleccionada.descuento).toFixed(2)})</span>
              )}</p>
              <p className="text-gray-500 text-xs">Pagado: ${Number(seleccionada.totalPagado).toFixed(2)} · Saldo: ${Number(seleccionada.saldo).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Clases</p>
              <p className="text-gray-700">
                {seleccionada.numeroClasesContratadas != null
                  ? `${seleccionada.clasesRestantes} restantes de ${seleccionada.numeroClasesContratadas}`
                  : 'No aplica'}
              </p>
            </div>
          </div>

          {(seleccionada.indicadores?.length > 0 || seleccionada.renovada) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {seleccionada.indicadores.map((ind) => (
                <span key={ind} className={'px-2 py-0.5 rounded-full text-xs ' + (INDICADOR_COLOR[ind] || 'bg-gray-100 text-gray-600')}>
                  {INDICADOR_LABEL[ind] || ind}
                </span>
              ))}
              {seleccionada.renovada && <span className="px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700">Renovada ✓</span>}
            </div>
          )}
          {seleccionada.suspendidaMotivo && seleccionada.estado === 'SUSPENDIDA' && (
            <p className="text-xs text-orange-700 mt-2">Motivo de suspensión: {seleccionada.suspendidaMotivo}</p>
          )}
          {seleccionada.canceladaMotivo && (
            <p className="text-xs text-gray-500 mt-2">Motivo de cancelación: {seleccionada.canceladaMotivo}</p>
          )}
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Historial de membresías</h2>
          <Link to="/membresias" className="text-xs text-brand-600 hover:underline">
            Registrar nueva membresía
          </Link>
        </div>
        {membresias.length === 0 ? (
          <p className="text-sm text-gray-400">Este alumno aun no tiene membresias registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Plan</th>
                <th>Disciplinas</th>
                <th>Vigencia</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {membresias.map((m) => (
                <tr key={m.id} className={'border-b border-gray-50 cursor-pointer ' + (seleccionada?.id === m.id ? 'bg-brand-50/50' : '')}
                    onClick={() => setSeleccionada(m)}>
                  <td className="py-2 text-gray-800">{m.planNombre}</td>
                  <td className="text-gray-500 text-xs">{m.disciplinaNombres?.join(', ') || '-'}</td>
                  <td className="text-gray-600">{m.fechaInicio} — {m.fechaFin || 'sin fecha'}</td>
                  <td className="text-gray-600">${Number(m.precioFinal).toFixed(2)}</td>
                  <td className="text-gray-600">${Number(m.saldo).toFixed(2)}</td>
                  <td>
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[m.estado]}>{m.estado}</span>
                    {m.renovada && <span className="ml-1 text-[10px] text-brand-600">renovada</span>}
                  </td>
                  <td className="text-right">
                    <button type="button" className="text-xs text-brand-600 hover:underline" onClick={(e) => { e.stopPropagation(); verPagos(m); }}>
                      Ver pagos →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {seleccionada && (
        <div className="card" ref={pagosRef}>
          <h2 className="font-semibold text-gray-800 mb-3">Historial de pagos — {seleccionada.planNombre}</h2>
          {pagos.length === 0 ? (
            <p className="text-sm text-gray-400">Aun no hay pagos registrados para esta membresía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2">Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Registrado por</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{p.fecha}</td>
                    <td className="text-gray-800">${Number(p.monto).toFixed(2)}</td>
                    <td className="text-gray-600">{p.metodoPago}</td>
                    <td className="text-gray-600">{p.registradoPorNombre || '-'}</td>
                    <td>
                      <span className={'px-2 py-0.5 rounded-full text-xs ' + (p.estado === 'VALIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 line-through')}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="text-right">
                      {p.estado === 'VALIDO' && (
                        <button className="text-red-600 text-xs hover:underline" onClick={() => handleCancelarPago(p.id)}>Cancelar pago</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalPago && seleccionada && (
        <Modal title="Registrar pago" onClose={() => setModalPago(false)}>
          <form onSubmit={handleRegistrarPago} className="space-y-3">
            <p className="text-sm text-gray-600">Saldo pendiente: <strong>${Number(seleccionada.saldo).toFixed(2)}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input className="input" type="number" step="0.01" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select className="input" value={pagoForm.metodoPago} onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <button className="btn-primary w-full mt-2">Registrar pago</button>
          </form>
        </Modal>
      )}

      {modalRenovar && seleccionada && (
        <Modal title="Renovar membresía" onClose={() => setModalRenovar(false)}>
          <form onSubmit={handleRenovar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input" value={renovarForm.planId} onChange={(e) => setRenovarForm({ ...renovarForm, planId: e.target.value, disciplinaIds: [] })}>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>)}
              </select>
            </div>
            {planSeleccionadoRenovar && !planSeleccionadoRenovar.accesoCompleto && planSeleccionadoRenovar.disciplinaIds?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplinas (máx. {planSeleccionadoRenovar.maxDisciplinasSeleccionables || 1})
                </label>
                <div className="flex flex-wrap gap-2">
                  {disciplinas.filter((d) => planSeleccionadoRenovar.disciplinaIds.includes(d.id)).map((d) => (
                    <button type="button" key={d.id} onClick={() => toggleDisciplinaRenovar(d.id)}
                      className={'px-3 py-1 rounded-full text-xs border ' + (renovarForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                      {d.icono} {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
              <input className="input" type="number" step="0.01" value={renovarForm.descuento} onChange={(e) => setRenovarForm({ ...renovarForm, descuento: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pago inicial (opcional)</label>
                <input className="input" type="number" step="0.01" value={renovarForm.montoPagoInicial} onChange={(e) => setRenovarForm({ ...renovarForm, montoPagoInicial: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select className="input" value={renovarForm.metodoPago} onChange={(e) => setRenovarForm({ ...renovarForm, metodoPago: e.target.value })}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              La fecha de inicio se calcula automáticamente: si esta membresía aún no vence, la nueva arranca al día
              siguiente de su vencimiento (no pierdes días); si ya venció, arranca hoy.
            </p>
            <button className="btn-primary w-full mt-2">Renovar</button>
          </form>
        </Modal>
      )}

      {modalMotivo && (
        <Modal title={modalMotivo.accion === 'suspender' ? 'Suspender membresía' : 'Cancelar membresía'} onClose={() => setModalMotivo(null)}>
          <form onSubmit={handleMotivoSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (obligatorio)</label>
              <textarea className="input" rows={3} value={modalMotivo.motivo} onChange={(e) => setModalMotivo({ ...modalMotivo, motivo: e.target.value })} />
            </div>
            <button className={'w-full mt-2 ' + (modalMotivo.accion === 'cancelar' ? 'btn-danger' : 'btn-primary')}>
              {modalMotivo.accion === 'suspender' ? 'Suspender' : 'Cancelar membresía'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
