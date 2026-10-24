import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as apartadosPlanApi from '../api/apartadosPlan';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import * as cortesCajaApi from '../api/cortesCaja';
import { useNotify } from '../context/NotifyContext.jsx';
import { describirPlan } from '../utils/planes.js';
import Modal from './Modal.jsx';
import InicioMembresiaSelector from './InicioMembresiaSelector.jsx';
import MembresiaRegistradaPanel from './MembresiaRegistradaPanel.jsx';
import PhoneInput from './PhoneInput.jsx';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// Convierte un apartado de plan de la tienda en linea en una membresia real: el staff liga
// el apartado a un alumno que ya existe (sugeridos por correo/telefono/nombre, o buscado a
// mano) o da de alta uno nuevo con los datos que dejo el cliente. El anticipo ya pagado
// queda como primer pago de la membresia (no se vuelve a cobrar); lo que falte se puede
// cobrar aqui mismo o despues como abono. Lo usan Apartados.jsx y Membresias.jsx.
export default function ConvertirApartadoPlanModal({ apartado, onClose, onConvertido }) {
  const { notify, confirmDialog } = useNotify();
  const [plan, setPlan] = useState(null);
  const [disciplinas, setDisciplinas] = useState([]);
  const [coincidencias, setCoincidencias] = useState(null); // null = cargando
  const [corteAbierto, setCorteAbierto] = useState(null);

  const [modo, setModo] = useState('existente'); // existente | nuevo
  const [alumnoSel, setAlumnoSel] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [nuevo, setNuevo] = useState({
    nombre: apartado.clienteNombre,
    telefono: apartado.clienteTelefono ? `+52 ${String(apartado.clienteTelefono).replace(/\D/g, '').slice(-10)}` : '',
    email: apartado.clienteEmail || '',
    fechaNacimiento: '',
  });

  const [disciplinaIds, setDisciplinaIds] = useState([]);
  // Inicio de vigencia: automatico por clases de hoy (default) o una fecha futura elegida.
  const [inicio, setInicio] = useState({ modo: 'auto', fecha: '', sucursalId: '' });
  const [descuento, setDescuento] = useState('0');
  const [pagoAdicional, setPagoAdicional] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlan(data.data.find((p) => p.id === apartado.planId) || null));
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
    cortesCajaApi.getCorteAbierto().then(({ data }) => setCorteAbierto(data.data)).catch(() => setCorteAbierto(null));
    apartadosPlanApi.alumnosCoincidentes(apartado.id)
      .then(({ data }) => {
        setCoincidencias(data.data);
        // Sin ninguna coincidencia lo mas probable es que sea alumno nuevo.
        if (data.data.length === 0) setModo('nuevo');
      })
      .catch(() => setCoincidencias([]));
  }, [apartado.id, apartado.planId]);

  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    const t = setTimeout(() => {
      alumnosApi.listAlumnos(busqueda.trim(), 0, 8).then(({ data }) => setResultados(data.data.content));
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  const precio = plan ? Number(plan.precio) : Number(apartado.precioPlan);
  const total = Math.max(0, precio - Number(descuento || 0));
  const anticipo = Number(apartado.montoAnticipo);
  const saldoTrasAnticipo = Math.max(0, total - anticipo);
  // Lo que entrega el cliente. En efectivo puede ser mas que el saldo: se abona solo hasta el
  // saldo y el resto es su cambio (el backend hace el mismo calculo). En tarjeta/transferencia
  // no hay cambio, asi que no puede pasar del saldo.
  const recibido = Number(pagoAdicional || 0);
  const esEfectivo = metodoPago === 'EFECTIVO';
  const adicional = esEfectivo ? Math.min(recibido, saldoTrasAnticipo) : recibido;
  const cambio = esEfectivo ? Math.max(0, recibido - saldoTrasAnticipo) : 0;
  const saldoFinal = Math.max(0, saldoTrasAnticipo - adicional);
  // Despues de dar de alta: pantalla final con cambio, QR (alumno nuevo) y ticket.
  const [resultado, setResultado] = useState(null); // { apartado, alumnoNuevo, cambio }
  const requiereDisciplinas = plan && !plan.accesoCompleto && plan.disciplinaIds?.length > 0;
  const maxDisciplinas = plan?.maxDisciplinasSeleccionables || 1;

  function toggleDisciplina(id) {
    setDisciplinaIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= maxDisciplinas) return ids;
      return [...ids, id];
    });
  }

  function elegirAlumno(a) {
    setAlumnoSel(a);
    setBusqueda('');
    setResultados([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!plan) {
      notify('El plan de este apartado ya no está activo; no se puede dar de alta la membresía', 'error');
      return;
    }
    if (modo === 'existente' && !alumnoSel) {
      notify('Selecciona el alumno o cambia a "Alumno nuevo"', 'error');
      return;
    }
    if (modo === 'nuevo' && !nuevo.nombre.trim()) {
      notify('El nombre del alumno es obligatorio', 'error');
      return;
    }
    if (requiereDisciplinas && disciplinaIds.length === 0) {
      notify('Selecciona al menos una disciplina', 'error');
      return;
    }
    if (adicional > 0 && !corteAbierto) {
      notify('Para cobrar en mostrador necesitas un corte de caja abierto', 'error');
      return;
    }
    if (!esEfectivo && recibido > saldoTrasAnticipo) {
      notify(`Con ${metodoPago.toLowerCase()} no hay cambio: el cobro no puede pasar del saldo (${fmt(saldoTrasAnticipo)})`, 'error');
      return;
    }
    const nombreAlumno = modo === 'existente' ? alumnoSel.nombre : nuevo.nombre.trim();
    const ok = await confirmDialog(
      `¿Dar de alta "${plan.nombre}" para ${nombreAlumno}${modo === 'nuevo' ? ' (alumno nuevo)' : ''}? ` +
      `El anticipo de ${fmt(anticipo)} queda como primer pago${adicional > 0 ? ` y se cobran ${fmt(adicional)} ahora` : ''}` +
      `${cambio > 0 ? `; cambio a entregar: ${fmt(cambio)}` : ''}.`,
    );
    if (!ok) return;

    setEnviando(true);
    try {
      const { data } = await apartadosPlanApi.convertirApartadoPlan(apartado.id, {
        alumnoId: modo === 'existente' ? alumnoSel.id : null,
        nuevoAlumno: modo === 'nuevo' ? {
          nombre: nuevo.nombre.trim(),
          telefono: nuevo.telefono || null,
          email: nuevo.email.trim() || null,
          fechaNacimiento: nuevo.fechaNacimiento || null,
        } : null,
        disciplinaIds,
        // null = automatico (el backend aplica la regla de clase disponible hoy)
        fechaInicio: inicio.modo === 'fecha' && inicio.fecha ? inicio.fecha : null,
        sucursalPreferidaId: inicio.sucursalId || null,
        descuento: Number(descuento || 0),
        // Se manda lo RECIBIDO: en efectivo el backend abona hasta el saldo y guarda el cambio.
        montoPagoAdicional: recibido > 0 ? recibido : null,
        metodoPago,
      });
      notify(`Membresía dada de alta para ${nombreAlumno}`, 'success');
      // Alumno nuevo: se recarga para tener su codigo QR e imprimirlo.
      let alumnoNuevo = null;
      if (modo === 'nuevo' && data.data.alumnoId) {
        try {
          alumnoNuevo = (await alumnosApi.getAlumno(data.data.alumnoId)).data.data;
        } catch {
          alumnoNuevo = null;
        }
      }
      setResultado({ apartado: data.data, alumnoNuevo, cambio });
    } catch (err) {
      const datos = err.response?.data?.data;
      const primerError = datos && typeof datos === 'object' && !Array.isArray(datos) ? Object.values(datos)[0] : null;
      notify(primerError || err.response?.data?.message || 'No se pudo dar de alta la membresía', 'error');
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    const terminar = () => onConvertido(resultado.apartado);
    return (
      <Modal title={`Apartado #${apartado.id} — listo`} onClose={terminar}>
        <MembresiaRegistradaPanel
          membresiaId={resultado.apartado.membresiaId}
          alumnoNuevo={resultado.alumnoNuevo}
          cambio={resultado.cambio}
          onListo={terminar}
        />
      </Modal>
    );
  }

  return (
    <Modal title={`Dar de alta membresía — apartado #${apartado.id}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <p className="font-medium text-gray-800">{apartado.clienteNombre}</p>
          <p className="text-xs text-gray-500">{apartado.clienteTelefono} · {apartado.clienteEmail}</p>
          <p className="text-xs text-gray-500 mt-1">
            Plan <strong>{apartado.planNombre}</strong> · anticipo pagado con tarjeta: <strong>{fmt(anticipo)}</strong>
          </p>
          {plan && <p className="text-xs text-gray-400 mt-1">{describirPlan(plan)}</p>}
          {plan === null && coincidencias !== null && (
            <p className="text-xs text-red-600 mt-1">⚠️ Este plan ya no está activo: no se puede dar de alta la membresía. Cancela el apartado o reactiva el plan.</p>
          )}
        </div>

        {/* 1. Alumno */}
        <div>
          <div className="flex gap-4 border-b border-gray-200 mb-3 text-sm">
            <button type="button" onClick={() => setModo('existente')}
              className={'pb-2 ' + (modo === 'existente' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}>
              Alumno existente
            </button>
            <button type="button" onClick={() => setModo('nuevo')}
              className={'pb-2 ' + (modo === 'nuevo' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}>
              + Alumno nuevo
            </button>
          </div>

          {modo === 'existente' ? (
            <div className="space-y-2">
              {alumnoSel ? (
                <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-brand-800">{alumnoSel.nombre}</span>
                    <span className="text-xs text-brand-600 block">{[alumnoSel.telefono, alumnoSel.email].filter(Boolean).join(' · ')}</span>
                  </span>
                  <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setAlumnoSel(null)}>Cambiar</button>
                </div>
              ) : (
                <>
                  {coincidencias === null ? (
                    <p className="text-xs text-gray-400">Buscando alumnos que coincidan...</p>
                  ) : coincidencias.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Posibles coincidencias (mismo correo, teléfono o nombre):</p>
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {coincidencias.map((a) => (
                          <button type="button" key={a.id} onClick={() => elegirAlumno(a)}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                            <span className="font-medium text-gray-800">{a.nombre}</span>
                            <span className="text-xs text-gray-500 block">{[a.telefono, a.email].filter(Boolean).join(' · ') || 'Sin contacto'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Buscar otro alumno por nombre</label>
                    <input className="input" placeholder="🔍 Nombre del alumno..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    {resultados.length > 0 && (
                      <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                        {resultados.map((a) => (
                          <button type="button" key={a.id} onClick={() => elegirAlumno(a)}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">
                            {a.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
                <input className="input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <PhoneInput value={nuevo.telefono} onChange={(v) => setNuevo({ ...nuevo, telefono: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input className="input" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de nacimiento</label>
                <input className="input" type="date" value={nuevo.fechaNacimiento} onChange={(e) => setNuevo({ ...nuevo, fechaNacimiento: e.target.value })} />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-400">Se precargaron los datos que dejó el cliente al apartar; corrígelos si hace falta. Al registrarlo se le envía su QR por correo.</p>
            </div>
          )}
        </div>

        {/* 2. Membresia */}
        {requiereDisciplinas && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas (máx. {maxDisciplinas})</label>
            <div className="flex flex-wrap gap-2">
              {disciplinas.filter((d) => plan.disciplinaIds.includes(d.id)).map((d) => (
                <button type="button" key={d.id} onClick={() => toggleDisciplina(d.id)}
                  className={'px-3 py-1 rounded-full text-xs border ' + (disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                  {d.icono} {d.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <InicioMembresiaSelector
          planId={plan?.id}
          alumno={modo === 'existente' ? alumnoSel : null}
          disciplinaIds={disciplinaIds}
          value={inicio}
          onChange={setInicio}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
          <input className="input" type="number" step="0.01" min="0" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm space-y-1">
          <div className="flex justify-between"><span>Total de la membresía</span><span>{fmt(total)}</span></div>
          <div className="flex justify-between text-emerald-700"><span>Anticipo ya pagado (tarjeta)</span><span>− {fmt(anticipo)}</span></div>
          {adicional > 0 && <div className="flex justify-between text-emerald-700"><span>Pago en mostrador</span><span>− {fmt(adicional)}</span></div>}
          <div className="flex justify-between font-semibold border-t border-gray-200 pt-1"><span>Saldo pendiente</span><span>{fmt(saldoFinal)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {esEfectivo ? 'Recibido en efectivo (opcional)' : 'Cobrar ahora (opcional)'}
            </label>
            <input className="input" type="number" step="0.01" min="0" placeholder={`Resta ${fmt(saldoTrasAnticipo)}`} value={pagoAdicional}
              onChange={(e) => setPagoAdicional(e.target.value)} />
            {saldoTrasAnticipo > 0 && !pagoAdicional && (
              <button type="button" className="text-xs text-brand-600 hover:underline mt-1" onClick={() => setPagoAdicional(String(saldoTrasAnticipo))}>
                Cobrar exacto ({fmt(saldoTrasAnticipo)})
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
            <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
        {cambio > 0 && (
          <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span className="text-sm text-emerald-800">Cambio a entregar</span>
            <span className="text-xl font-bold text-emerald-700">{fmt(cambio)}</span>
          </div>
        )}
        {!esEfectivo && recibido > saldoTrasAnticipo && (
          <p className="text-xs text-red-600">Con {metodoPago.toLowerCase()} no hay cambio: el cobro no puede pasar de {fmt(saldoTrasAnticipo)}.</p>
        )}
        {adicional > 0 && !corteAbierto && (
          <p className="text-xs text-red-600">
            ⚠️ Para cobrar en mostrador necesitas <Link to="/cortes-caja" className="underline">abrir un corte de caja</Link>. Sin cobro adicional no hace falta.
          </p>
        )}
        {plan && !plan.permiteAbonos && saldoFinal > 0 && (
          <p className="text-xs text-amber-700">Este plan no permite abonos: el resto ({fmt(saldoTrasAnticipo)}) tendrá que liquidarse en un solo pago.</p>
        )}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1" disabled={enviando || !plan}>{enviando ? 'Dando de alta...' : 'Dar de alta membresía'}</button>
        </div>
      </form>
    </Modal>
  );
}
