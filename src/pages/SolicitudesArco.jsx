import { useEffect, useState } from 'react';
import {
  abrirConstanciaArco, ejecutarArco, extenderArco, listSolicitudesArco, pedirInfoArco,
  registrarArcoEnMostrador, responderArco, verificarIdentidadArco,
} from '../api/arco';
import Modal from '../components/Modal.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';
import {
  ARCO_CANALES, ARCO_ESTADOS, ARCO_GUIA, ARCO_METODOS_IDENTIDAD, ARCO_TIPOS, ARCO_TIPOS_IDENTIDAD_FUERTE,
  ARCO_TIPO_ETIQUETA, fmtDia, fmtFechaHora,
} from '../utils/arcoTipos.js';

const FILTROS = [
  ['', 'Todas'], ['PENDIENTE_CORREO', 'Falta confirmar'], ['PENDIENTE', 'Pendientes'],
  ['INFO_SOLICITADA', 'Esperando info'], ['APROBADA', 'Por ejecutar'], ['COMPLETADA', 'Completadas'],
  ['RECHAZADA', 'Rechazadas'], ['NO_PRESENTADA', 'No presentadas'],
];

// "Solicitudes ARCO" (solo SUPER_ADMIN): todo el ciclo legal de las solicitudes de toda la
// plataforma (verificar identidad, pedir información, extender plazo, responder y
// ejecutar) y el registro en mostrador. Igual que la pantalla ArcoRequests de DemoPV.
export default function SolicitudesArco() {
  const { notify, confirmDialog } = useNotify();
  const [filtro, setFiltro] = useState('');
  const [solicitudes, setSolicitudes] = useState(null);
  const [abiertaId, setAbiertaId] = useState(null);
  const [mostrador, setMostrador] = useState(false);

  function cargar() {
    listSolicitudesArco(filtro)
      .then(({ data }) => setSolicitudes(data.data))
      .catch(() => setSolicitudes([]));
  }

  useEffect(() => { setSolicitudes(null); cargar(); }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = { notify, confirmDialog, onCambio: cargar };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="text-xl font-bold text-gray-800">Solicitudes ARCO</h1>
        <button type="button" className="btn-primary" onClick={() => setMostrador(true)}>+ Registrar en mostrador</button>
      </div>
      <p className="text-gray-500 text-sm mb-2">
        Acceso, Rectificación, Cancelación, Oposición, Revocación y Limitación sobre datos personales. Aplica a toda la
        plataforma, no a un centro en particular.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Formulario público para alumnos y clientes: <span className="font-mono">{window.location.origin}/arco</span>
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map(([valor, etiqueta]) => (
          <button key={valor} type="button" onClick={() => setFiltro(valor)}
            className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
              (filtro === valor ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        {!solicitudes ? (
          <p className="p-10 text-center text-sm text-gray-400">Cargando...</p>
        ) : solicitudes.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">Sin solicitudes.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {solicitudes.map((s) => (
              <div key={s.id}>
                <button type="button" onClick={() => setAbiertaId(abiertaId === s.id ? null : s.id)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 flex flex-wrap items-center gap-3">
                  <span className={'badge ' + ARCO_ESTADOS[s.estado].color}>{ARCO_ESTADOS[s.estado].label}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{ARCO_TIPO_ETIQUETA[s.tipo]}</span>
                  <span className="text-[10px] font-medium text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{ARCO_CANALES[s.canal]}</span>
                  <span className="font-medium text-gray-800">{s.nombre}</span>
                  <span className="text-sm text-gray-500">{s.email || '(sin correo)'}</span>
                  {s.telefono && <span className="text-sm text-gray-400">{s.telefono}</span>}
                  <span className="text-xs text-gray-400 ml-auto">#{s.id} · {fmtFechaHora(s.createdAt)}</span>
                </button>
                {abiertaId === s.id && <Detalle s={s} ctx={ctx} onCerrar={() => setAbiertaId(null)} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {mostrador && (
        <MostradorModal ctx={ctx} onClose={() => setMostrador(false)} onCreada={() => { setMostrador(false); cargar(); }} />
      )}
    </div>
  );
}

/** Corre una accion del ciclo: confirma, llama al backend, avisa y recarga. */
async function ejecutarAccion(ctx, { mensaje, titulo, boton, danger, llamada, exito, despues }) {
  if (!(await confirmarAccion(ctx.confirmDialog, mensaje, { title: titulo, confirmLabel: boton, danger }))) return false;
  try {
    await llamada();
    ctx.notify(exito, 'success');
    despues?.();
    ctx.onCambio();
    return true;
  } catch (err) {
    ctx.notify(err.response?.data?.message || 'No se pudo completar la acción', 'error');
    return false;
  }
}

function Detalle({ s, ctx, onCerrar }) {
  const guia = ARCO_GUIA[s.tipo];
  const pideIdentidad = ARCO_TIPOS_IDENTIDAD_FUERTE.includes(s.tipo);
  const cerrada = ['COMPLETADA', 'RECHAZADA', 'NO_PRESENTADA'].includes(s.estado);

  return (
    <div className="px-5 pb-5 bg-gray-50/60 space-y-3">
      <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-3 space-y-1.5 text-sm">
        <p className="text-brand-900"><span className="font-semibold">¿Qué es "{ARCO_TIPO_ETIQUETA[s.tipo]}"?</span> {guia.significa}</p>
        <p className="text-brand-800"><span className="font-semibold">Cómo resolverlo:</span> {guia.comoResolver}</p>
      </div>

      {s.representante && <p className="text-sm text-gray-600"><span className="font-semibold">Actúa a nombre de:</span> {s.representadoNombre}</p>}
      {s.detalle && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Detalle de la persona</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.detalle}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2">
        {s.recibidaEn && <div><span className="block text-gray-400">Recibida</span>{fmtFechaHora(s.recibidaEn)}</div>}
        {s.fechaLimite && <div><span className="block text-gray-400">Plazo de respuesta{s.extendida ? ' (extendido)' : ''}</span>{fmtDia(s.fechaLimite)}</div>}
        {s.ejecucionFechaLimite && <div><span className="block text-gray-400">Plazo de ejecución</span>{fmtDia(s.ejecucionFechaLimite)}</div>}
        {s.registradaPorNombre && <div><span className="block text-gray-400">Registrada por</span>{s.registradaPorNombre}</div>}
      </div>
      {s.motivoExtension && <p className="text-xs text-gray-500"><span className="font-semibold">Motivo de la extensión:</span> {s.motivoExtension}</p>}

      {s.identidadVerificadaEn ? (
        <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Identidad verificada</span> ({ARCO_METODOS_IDENTIDAD[s.identidadMetodo] || s.identidadMetodo}), {fmtFechaHora(s.identidadVerificadaEn)}.
          {s.identidadNotas && <p className="mt-0.5">{s.identidadNotas}</p>}
        </div>
      ) : pideIdentidad && !cerrada && s.estado !== 'PENDIENTE_CORREO' ? (
        <VerificarIdentidad s={s} ctx={ctx} />
      ) : null}

      {s.estado === 'PENDIENTE_CORREO' && (
        <div className="bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-600">
          El titular todavía no confirma su correo. El plazo legal empieza a correr cuando abre el link; si no lo hace en 3 días, la solicitud se borra sola.
        </div>
      )}

      {s.estado === 'INFO_SOLICITADA' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-sm text-orange-900">
          <p><span className="font-semibold">Se le pidió:</span> {s.infoSolicitada}</p>
          {s.infoFechaLimite && <p className="text-xs text-orange-700 mt-1">Debe responder antes del {fmtDia(s.infoFechaLimite)}.</p>}
        </div>
      )}
      {s.infoRespuesta && (
        <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Respondió</p>
          <p className="text-gray-700 whitespace-pre-wrap">{s.infoRespuesta}</p>
        </div>
      )}

      {s.resultado && (
        <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Respondida por {s.respondidaPorNombre || '—'} · {fmtFechaHora(s.respondidaEn)} · {s.resultado}
          </p>
          <p className="text-gray-700 whitespace-pre-wrap">{s.respuesta}</p>
          {s.fundamento && <p className="text-gray-500 text-xs mt-1 whitespace-pre-wrap"><span className="font-semibold">Motivo:</span> {s.fundamento}</p>}
        </div>
      )}
      {s.resumenEjecucion && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
            Ejecutada por {s.ejecutadaPorNombre || '—'} · {fmtFechaHora(s.ejecutadaEn)}
          </p>
          <p className="text-green-800 whitespace-pre-wrap">{s.resumenEjecucion}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {s.estado === 'PENDIENTE' && (
          <AccionConTexto ctx={ctx} boton="Pedir información" placeholder="Qué necesitas que te confirme o envíe" multilinea
            mensaje={() => '¿Pedir esta información al titular? Le llegará por correo y tendrá 10 días hábiles para responder.'}
            llamada={(texto) => pedirInfoArco(s.id, { infoSolicitada: texto })} exito="Se le pidió información al titular" />
        )}
        {!cerrada && !s.extendida && s.fechaLimite && (
          <AccionConTexto ctx={ctx} boton="Extender plazo (+20 días hábiles)" placeholder="Motivo de la extensión"
            mensaje={() => '¿Extender el plazo de respuesta 20 días hábiles? Solo se puede hacer una vez.'}
            llamada={(texto) => extenderArco(s.id, { motivo: texto })} exito="Plazo extendido" />
        )}
        {(s.resultado || cerrada) && (
          <button type="button" className="btn-secondary text-sm"
            onClick={() => abrirConstanciaArco(s.id).catch(() => ctx.notify('No se pudo abrir la constancia', 'error'))}>
            📄 Ver constancia
          </button>
        )}
      </div>

      {s.estado === 'PENDIENTE' && <Responder s={s} ctx={ctx} onCerrar={onCerrar} />}
      {s.estado === 'APROBADA' && <Ejecutar s={s} ctx={ctx} onCerrar={onCerrar} />}
    </div>
  );
}

function VerificarIdentidad({ s, ctx }) {
  const [metodo, setMetodo] = useState('EN_PERSONA');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar() {
    if (!notas.trim()) { ctx.notify('Explica cómo verificaste su identidad', 'error'); return; }
    setGuardando(true);
    await ejecutarAccion(ctx, {
      mensaje: `¿Marcar como verificada la identidad de ${s.nombre}?`, titulo: 'Confirmar verificación', boton: 'Sí, verificar',
      llamada: () => verificarIdentidadArco(s.id, { metodo, notas: notas.trim() }), exito: 'Identidad verificada',
    });
    setGuardando(false);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-2">
      <p className="text-sm text-amber-900 font-semibold">Este tipo de solicitud necesita verificar la identidad antes de responderla</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select className="input sm:!w-auto" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {Object.entries(ARCO_METODOS_IDENTIDAD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input flex-1" placeholder="Cómo la verificaste (ej. INE mostrada en recepción)" value={notas}
          onChange={(e) => setNotas(e.target.value)} />
      </div>
      <button type="button" className="btn-primary text-sm" disabled={guardando} onClick={enviar}>
        {guardando ? 'Guardando...' : 'Marcar identidad verificada'}
      </button>
    </div>
  );
}

/** Boton que se despliega en un campo de texto + enviar (pedir info, extender plazo). */
function AccionConTexto({ ctx, boton, placeholder, multilinea, mensaje, llamada, exito }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar() {
    if (!texto.trim()) { ctx.notify('Completa el campo', 'error'); return; }
    setGuardando(true);
    const ok = await ejecutarAccion(ctx, {
      mensaje: mensaje(), titulo: 'Confirmar acción', boton: 'Sí, continuar',
      llamada: () => llamada(texto.trim()), exito,
    });
    setGuardando(false);
    if (ok) { setTexto(''); setAbierto(false); }
  }

  if (!abierto) return <button type="button" className="btn-secondary text-sm" onClick={() => setAbierto(true)}>{boton}</button>;
  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 space-y-2">
      {multilinea
        ? <textarea className="input" rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} />
        : <input className="input" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} />}
      <div className="flex gap-2">
        <button type="button" className="btn-primary text-sm" disabled={guardando} onClick={enviar}>{guardando ? 'Enviando...' : boton}</button>
        <button type="button" className="btn-secondary text-sm" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function Responder({ s, ctx, onCerrar }) {
  const [resultado, setResultado] = useState('PROCEDENTE');
  const [fundamento, setFundamento] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar() {
    if (!respuesta.trim()) { ctx.notify('Explica tu respuesta: queda como constancia', 'error'); return; }
    if (resultado !== 'PROCEDENTE' && !fundamento.trim()) { ctx.notify('Explica el motivo/fundamento', 'error'); return; }
    setGuardando(true);
    await ejecutarAccion(ctx, {
      mensaje: `¿Responder esta solicitud como "${resultado}"? Se le enviará la constancia al titular y no se puede deshacer.`,
      titulo: 'Confirmar respuesta', boton: 'Sí, responder', danger: resultado === 'IMPROCEDENTE',
      llamada: () => responderArco(s.id, { resultado, fundamento: fundamento.trim() || undefined, respuesta: respuesta.trim() }),
      exito: 'Solicitud respondida', despues: onCerrar,
    });
    setGuardando(false);
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Responder</p>
      <div className="flex flex-wrap gap-2">
        {['PROCEDENTE', 'PARCIAL', 'IMPROCEDENTE'].map((o) => (
          <button key={o} type="button" onClick={() => setResultado(o)}
            className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' + (resultado === o
              ? (o === 'IMPROCEDENTE' ? 'bg-red-600 text-white' : 'bg-green-600 text-white')
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100')}>
            {o}
          </button>
        ))}
      </div>
      {resultado !== 'PROCEDENTE' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Motivo/fundamento (obligatorio)</label>
          <textarea className="input" rows={2} maxLength={2000} value={fundamento} onChange={(e) => setFundamento(e.target.value)} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Respuesta (queda como constancia)</label>
        <textarea className="input" rows={2} maxLength={2000} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
      </div>
      <button type="button" className="btn-primary" disabled={guardando} onClick={enviar}>{guardando ? 'Guardando...' : 'Guardar respuesta'}</button>
    </div>
  );
}

function Ejecutar({ s, ctx, onCerrar }) {
  const [resumen, setResumen] = useState('');
  const [guardando, setGuardando] = useState(false);
  const aviso = s.tipo === 'CANCELACION'
    ? ' Si el titular tiene cuenta de acceso, se desactivará.'
    : s.tipo === 'ACCESO' ? ' Se agregará un resumen de sus datos en el sistema.' : '';

  async function enviar() {
    if (!resumen.trim()) { ctx.notify('Describe qué hiciste: queda como constancia', 'error'); return; }
    setGuardando(true);
    await ejecutarAccion(ctx, {
      mensaje: `¿Ejecutar y cerrar esta solicitud?${aviso} Se le enviará la constancia final al titular y no se puede deshacer.`,
      titulo: 'Confirmar ejecución', boton: 'Sí, ejecutar', danger: s.tipo === 'CANCELACION',
      llamada: () => ejecutarArco(s.id, { resumen: resumen.trim() }),
      exito: 'Solicitud ejecutada y completada', despues: onCerrar,
    });
    setGuardando(false);
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ejecutar</p>
      <textarea className="input" rows={2} maxLength={2000} value={resumen} onChange={(e) => setResumen(e.target.value)}
        placeholder="Qué hiciste para cumplir la respuesta" />
      <button type="button" className="btn-primary" disabled={guardando} onClick={enviar}>{guardando ? 'Ejecutando...' : 'Ejecutar y completar'}</button>
    </div>
  );
}

/** Registro en mostrador: alguien verificado en persona, con o sin cuenta (ej. un alumno en recepción). */
function MostradorModal({ ctx, onClose, onCreada }) {
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', tipo: '', detalle: '', representante: false, representadoNombre: '', identidadNotas: '',
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!form.tipo) errs.tipo = 'Elige qué tipo de solicitud quiere hacer';
    if (form.telefono && form.telefono.length !== 10) errs.telefono = 'El teléfono debe tener 10 dígitos';
    if (form.representante && !form.representadoNombre.trim()) errs.representadoNombre = 'Escribe el nombre de a quién representa';
    if (!form.identidadNotas.trim()) errs.identidadNotas = 'Explica cómo verificaste su identidad';
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    if (!(await confirmarAccion(ctx.confirmDialog,
      `¿Registrar la solicitud de ${ARCO_TIPO_ETIQUETA[form.tipo]} de "${form.nombre.trim()}"?`,
      { title: 'Confirmar registro', confirmLabel: 'Sí, registrar' }))) return;

    setGuardando(true);
    try {
      await registrarArcoEnMostrador({
        nombre: form.nombre.trim(),
        email: form.email.trim() || undefined,
        telefono: form.telefono || undefined,
        tipo: form.tipo,
        detalle: form.detalle.trim() || undefined,
        representante: form.representante,
        representadoNombre: form.representante ? form.representadoNombre.trim() : undefined,
        identidadNotas: form.identidadNotas.trim(),
      });
      ctx.notify('Solicitud registrada', 'success');
      onCreada();
    } catch (err) {
      ctx.notify(err.response?.data?.message || 'No se pudo registrar la solicitud', 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Registrar solicitud en mostrador" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-400 -mt-2">Para alguien que verificaste en persona, con o sin cuenta en el sistema.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          {errores.nombre && <p className="text-red-600 text-xs mt-1">{errores.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo (opcional)</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <p className="text-xs text-gray-400 mt-1">Si es el de una cuenta del sistema, queda ligada. También se usa para mandarle las respuestas.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
          <input className="input" inputMode="numeric" maxLength={10} value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          {errores.telefono && <p className="text-red-600 text-xs mt-1">{errores.telefono}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué quiere hacer?</label>
          <div className="grid grid-cols-2 gap-2">
            {ARCO_TIPOS.map(([valor, etiqueta]) => (
              <label key={valor}
                className={'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ' +
                  (form.tipo === valor ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50')}>
                <input type="radio" name="tipo-mostrador" checked={form.tipo === valor} onChange={() => setForm({ ...form, tipo: valor })} />
                {etiqueta}
              </label>
            ))}
          </div>
          {errores.tipo && <p className="text-red-600 text-xs mt-1">{errores.tipo}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detalle (opcional)</label>
          <textarea className="input" rows={2} maxLength={2000} value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={form.representante} onChange={(e) => setForm({ ...form, representante: e.target.checked })} />
          Actúa a nombre de alguien más (ej. padre o tutor de un menor)
        </label>
        {form.representante && (
          <div>
            <input className="input" placeholder="Nombre de a quién representa" value={form.representadoNombre}
              onChange={(e) => setForm({ ...form, representadoNombre: e.target.value })} />
            {errores.representadoNombre && <p className="text-red-600 text-xs mt-1">{errores.representadoNombre}</p>}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cómo verificaste su identidad</label>
          <input className="input" placeholder="Ej. INE mostrada en recepción" value={form.identidadNotas}
            onChange={(e) => setForm({ ...form, identidadNotas: e.target.value })} />
          {errores.identidadNotas && <p className="text-red-600 text-xs mt-1">{errores.identidadNotas}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</button>
        </div>
      </form>
    </Modal>
  );
}
