import { useEffect, useState } from 'react';
import { crearMiSolicitudArco, listMisSolicitudesArco, responderMiInfoArco } from '../api/arco';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';
import {
  ARCO_ESTADOS, ARCO_TIPOS, ARCO_TIPOS_IDENTIDAD_FUERTE, ARCO_TIPO_ETIQUETA, fmtDia, fmtFechaHora,
} from '../utils/arcoTipos.js';

// "Mis solicitudes ARCO": las que el usuario en sesión levantó con su cuenta (canal CUENTA).
// Abierta a cualquier rol. Desde la cuenta no hace falta confirmar correo (la sesión ya lo
// prueba); los tipos de identidad fuerte piden volver a escribir la contraseña.
export default function MisSolicitudesArco() {
  const { notify, confirmDialog } = useNotify();
  const [solicitudes, setSolicitudes] = useState(null);
  const [nueva, setNueva] = useState(false);

  function cargar() {
    listMisSolicitudesArco().then(({ data }) => setSolicitudes(data.data));
  }

  useEffect(cargar, []);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Mis solicitudes ARCO</h1>
          <p className="text-gray-500 text-sm">
            Ejerce tus derechos de Acceso, Rectificación, Cancelación, Oposición, Revocación o Limitación sobre tus datos personales.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setNueva(true)}>+ Nueva solicitud</button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {!solicitudes ? (
          <p className="p-10 text-center text-sm text-gray-400">Cargando...</p>
        ) : solicitudes.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">Todavía no has levantado ninguna solicitud.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {solicitudes.map((s) => (
              <Fila key={s.id} s={s} notify={notify} confirmDialog={confirmDialog} onRespondida={cargar} />
            ))}
          </div>
        )}
      </div>

      {nueva && (
        <NuevaSolicitudModal
          notify={notify}
          confirmDialog={confirmDialog}
          onClose={() => setNueva(false)}
          onCreada={() => { setNueva(false); cargar(); }}
        />
      )}
    </div>
  );
}

function Fila({ s, notify, confirmDialog, onRespondida }) {
  const estado = ARCO_ESTADOS[s.estado];
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function responder() {
    if (!respuesta.trim()) { notify('Escribe tu respuesta', 'error'); return; }
    if (!(await confirmarAccion(confirmDialog, '¿Enviar tu respuesta?', { title: 'Confirmar envío', confirmLabel: 'Sí, enviar' }))) return;
    setEnviando(true);
    try {
      await responderMiInfoArco(s.id, respuesta.trim());
      notify('Respuesta enviada', 'success');
      setRespuesta('');
      onRespondida();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar tu respuesta', 'error');
    } finally {
      setEnviando(false);
    }
  }

  const cerrada = ['COMPLETADA', 'RECHAZADA', 'NO_PRESENTADA'].includes(s.estado);
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className={'badge ' + estado.color}>{estado.label}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{ARCO_TIPO_ETIQUETA[s.tipo]}</span>
        <span className="text-xs text-gray-400">Folio #{s.id}</span>
        <span className="text-xs text-gray-400 ml-auto">{fmtFechaHora(s.createdAt)}</span>
      </div>
      {s.detalle && <p className="text-sm text-gray-600 whitespace-pre-wrap">{s.detalle}</p>}
      {s.fechaLimite && !cerrada && <p className="text-xs text-gray-400">Plazo de respuesta: {fmtDia(s.fechaLimite)}</p>}

      {s.estado === 'INFO_SOLICITADA' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 space-y-2">
          <p className="text-sm text-orange-900"><span className="font-semibold">Nos falta esto de tu parte:</span> {s.infoSolicitada}</p>
          {s.infoFechaLimite && <p className="text-xs text-orange-700">Respóndenos antes del {fmtDia(s.infoFechaLimite)}.</p>}
          <textarea className="input" rows={2} maxLength={2000} value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe tu respuesta" />
          <button type="button" className="btn-primary text-sm" disabled={enviando} onClick={responder}>
            {enviando ? 'Enviando...' : 'Enviar respuesta'}
          </button>
        </div>
      )}

      {s.resultado && (
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Respondida {fmtFechaHora(s.respondidaEn)} · {s.resultado}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.respuesta}</p>
          {s.fundamento && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">Motivo: {s.fundamento}</p>}
        </div>
      )}
      {s.estado === 'COMPLETADA' && s.resumenEjecucion && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">Qué se hizo</p>
          <p className="text-sm text-green-800 whitespace-pre-wrap">{s.resumenEjecucion}</p>
        </div>
      )}
    </div>
  );
}

function NuevaSolicitudModal({ notify, confirmDialog, onClose, onCreada }) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [detalle, setDetalle] = useState('');
  const [representante, setRepresentante] = useState(false);
  const [representadoNombre, setRepresentadoNombre] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const pidePassword = tipo && ARCO_TIPOS_IDENTIDAD_FUERTE.includes(tipo);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!tipo) errs.tipo = 'Elige qué tipo de solicitud quieres hacer';
    if (telefono && telefono.length !== 10) errs.telefono = 'El teléfono debe tener 10 dígitos';
    if (representante && !representadoNombre.trim()) errs.representadoNombre = 'Escribe el nombre de quien representas';
    if (pidePassword && !password) errs.password = 'Vuelve a escribir tu contraseña para confirmar que eres tú';
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    if (!(await confirmarAccion(confirmDialog, `¿Enviar tu solicitud de ${ARCO_TIPO_ETIQUETA[tipo]}?`,
      { title: 'Confirmar solicitud', confirmLabel: 'Sí, enviar' }))) return;

    setGuardando(true);
    try {
      await crearMiSolicitudArco({
        telefono: telefono || undefined,
        tipo,
        detalle: detalle.trim() || undefined,
        representante,
        representadoNombre: representante ? representadoNombre.trim() : undefined,
        password: pidePassword ? password : undefined,
        aceptaAvisoPrivacidad: true,
      });
      notify('Solicitud enviada', 'success');
      onCreada();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar la solicitud', 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nueva solicitud ARCO" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-400 -mt-2">Se manda a nombre de {user?.nombre} ({user?.email}).</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué quieres hacer?</label>
          <div className="space-y-2">
            {ARCO_TIPOS.map(([valor, etiqueta, ayuda]) => (
              <label key={valor}
                className={'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ' +
                  (tipo === valor ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50')}>
                <input type="radio" name="tipo" className="mt-1" checked={tipo === valor} onChange={() => setTipo(valor)} />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{etiqueta}</span>
                  <span className="block text-xs text-gray-500">{ayuda}</span>
                </span>
              </label>
            ))}
          </div>
          {errores.tipo && <p className="text-red-600 text-xs mt-1">{errores.tipo}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
          <input className="input" type="tel" inputMode="numeric" maxLength={10} value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          {errores.telefono && <p className="text-red-600 text-xs mt-1">{errores.telefono}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuéntanos más (opcional)</label>
          <textarea className="input" rows={3} maxLength={2000} value={detalle} onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej. qué dato quieres corregir" />
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={representante} onChange={(e) => setRepresentante(e.target.checked)} />
          Hago esta solicitud a nombre de alguien más (soy su representante)
        </label>
        {representante && (
          <div>
            <input className="input" placeholder="Nombre de la persona a la que representas" value={representadoNombre}
              onChange={(e) => setRepresentadoNombre(e.target.value)} />
            {errores.representadoNombre && <p className="text-red-600 text-xs mt-1">{errores.representadoNombre}</p>}
          </div>
        )}

        {pidePassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirma tu contraseña</label>
            <input className="input" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Este tipo de solicitud expone o altera datos sensibles; confirmamos que de verdad eres tú.</p>
            {errores.password && <p className="text-red-600 text-xs mt-1">{errores.password}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Enviando...' : 'Enviar solicitud'}</button>
        </div>
      </form>
    </Modal>
  );
}
