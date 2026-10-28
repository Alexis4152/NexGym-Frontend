import { useState } from 'react';
import { Link } from 'react-router-dom';
import { crearSolicitudArcoPublica } from '../api/arco';
import { useNotify } from '../context/NotifyContext.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';
import { ARCO_TIPOS, ARCO_TIPO_ETIQUETA } from '../utils/arcoTipos.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulario público de derechos ARCO (/arco), sin sesión ni centro: la solicitud es de la
// plataforma y la atiende el SUPER_ADMIN. El correo debe estar registrado en el sistema
// (usuario o alumno) y hay que confirmarlo con el link que llega; desde ese mismo link se
// da seguimiento (ArcoSeguimiento.jsx). Se enlaza desde el login.
export default function ArcoSolicitud() {
  const { confirmDialog } = useNotify();
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', tipo: '', detalle: '', representante: false, representadoNombre: '',
  });
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [verAviso, setVerAviso] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviada, setEnviada] = useState(false);

  function validar() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Tu nombre es obligatorio';
    if (!form.email.trim()) e.email = 'Tu correo es obligatorio';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Correo inválido';
    if (form.telefono && form.telefono.length !== 10) e.telefono = 'El teléfono debe tener 10 dígitos';
    if (!form.tipo) e.tipo = 'Elige qué tipo de solicitud quieres hacer';
    if (form.representante && !form.representadoNombre.trim()) e.representadoNombre = 'Escribe el nombre de quien representas';
    if (!aceptaAviso) e.aceptaAviso = 'Debes aceptar el aviso de privacidad';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    if (!(await confirmarAccion(confirmDialog,
      `¿Enviar tu solicitud de ${ARCO_TIPO_ETIQUETA[form.tipo]}? Te llegará un correo a ${form.email.trim()} para confirmarla.`,
      { title: 'Confirmar solicitud', confirmLabel: 'Sí, enviar' }))) return;
    setError('');
    setEnviando(true);
    try {
      await crearSolicitudArcoPublica({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono || undefined,
        tipo: form.tipo,
        detalle: form.detalle.trim() || undefined,
        representante: form.representante,
        representadoNombre: form.representante ? form.representadoNombre.trim() : undefined,
        aceptaAvisoPrivacidad: aceptaAviso,
      });
      setEnviada(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo enviar tu solicitud. Intenta de nuevo más tarde.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="card w-full max-w-lg">
        <h1 className="text-xl font-bold text-brand-700 mb-1">Derechos ARCO</h1>
        <p className="text-sm text-gray-500 mb-6">
          Acceso, Rectificación, Cancelación, Oposición, Revocación o Limitación sobre tus datos personales en NexoraSport.
        </p>

        {enviada ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-4">
              Te mandamos un correo a <span className="font-medium">{form.email}</span> para confirmar tu solicitud.
              Ábrelo y entra al link para que empiece a correr el plazo de respuesta; desde ahí también podrás darle seguimiento.
            </div>
            <Link to="/login" className="block text-center text-xs text-brand-600 hover:underline">Volver a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
              <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errores.nombre && <p className="text-red-600 text-xs mt-1">{errores.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu correo</label>
              <input className="input" type="email" placeholder="correo@ejemplo.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">
                Usa el correo que registraste en tu centro deportivo (o el de tu cuenta del sistema). Te mandaremos un link para confirmarlo.
              </p>
              {errores.email && <p className="text-red-600 text-xs mt-1">{errores.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
              <input className="input" type="tel" inputMode="numeric" maxLength={10} value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              {errores.telefono && <p className="text-red-600 text-xs mt-1">{errores.telefono}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué quieres hacer?</label>
              <div className="space-y-2">
                {ARCO_TIPOS.map(([valor, etiqueta, ayuda]) => (
                  <label key={valor}
                    className={'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ' +
                      (form.tipo === valor ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50')}>
                    <input type="radio" name="tipo" className="mt-1" checked={form.tipo === valor}
                      onChange={() => setForm({ ...form, tipo: valor })} />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuéntanos más (opcional)</label>
              <textarea className="input" rows={3} maxLength={2000} value={form.detalle}
                placeholder="Ej. en qué centro estás inscrito, o qué dato quieres corregir"
                onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={form.representante}
                  onChange={(e) => setForm({ ...form, representante: e.target.checked })} />
                Hago esta solicitud a nombre de alguien más (soy su representante; por ejemplo, padre o tutor de un menor)
              </label>
              {form.representante && (
                <div>
                  <input className="input" placeholder="Nombre de la persona a la que representas" value={form.representadoNombre}
                    onChange={(e) => setForm({ ...form, representadoNombre: e.target.value })} />
                  {errores.representadoNombre && <p className="text-red-600 text-xs mt-1">{errores.representadoNombre}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={aceptaAviso} onChange={(e) => setAceptaAviso(e.target.checked)} />
                <span>
                  Acepto el{' '}
                  <button type="button" className="text-brand-600 hover:underline" onClick={() => setVerAviso((v) => !v)}>
                    aviso de privacidad
                  </button>
                </span>
              </label>
              {errores.aceptaAviso && <p className="text-red-600 text-xs mt-1">{errores.aceptaAviso}</p>}
              {verAviso && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 space-y-1.5">
                  <p>
                    Los datos que nos compartas en este formulario (nombre, correo, teléfono y el detalle que escribas) se usan
                    únicamente para identificarte, dar seguimiento a tu solicitud y responderte por correo. No se usan para
                    otros fines ni se comparten con terceros.
                  </p>
                  <p>
                    Como titular tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos (derechos
                    ARCO), así como a Revocar tu consentimiento o Limitar su uso: es justo lo que este formulario te permite ejercer.
                  </p>
                </div>
              )}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <Link to="/login" className="block text-center text-xs text-brand-600 hover:underline">Volver a iniciar sesión</Link>
          </form>
        )}
      </div>
    </div>
  );
}
