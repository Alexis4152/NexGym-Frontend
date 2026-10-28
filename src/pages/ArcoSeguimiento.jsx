import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { responderInfoArcoPorToken, seguimientoArco } from '../api/arco';
import { useNotify } from '../context/NotifyContext.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';
import { ARCO_ESTADOS, ARCO_TIPO_ETIQUETA, fmtDia, fmtFechaHora } from '../utils/arcoTipos.js';

// Seguimiento público de una solicitud ARCO por el link del correo (/arco/seguimiento/:token).
// Abrirlo YA confirma el correo si seguía pendiente (lo hace el backend en el mismo GET). Si
// se le pidió información al titular, aquí mismo la contesta. El token es la única credencial.
export default function ArcoSeguimiento() {
  const { token } = useParams();
  const { confirmDialog } = useNotify();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorRespuesta, setErrorRespuesta] = useState('');

  useEffect(() => {
    setCargando(true);
    seguimientoArco(token)
      .then(({ data: r }) => setData(r.data))
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar tu solicitud.'))
      .finally(() => setCargando(false));
  }, [token]);

  async function handleResponder(e) {
    e.preventDefault();
    if (!respuesta.trim()) { setErrorRespuesta('Escribe tu respuesta'); return; }
    if (!(await confirmarAccion(confirmDialog, '¿Enviar tu respuesta?', { title: 'Confirmar envío', confirmLabel: 'Sí, enviar' }))) return;
    setErrorRespuesta('');
    setEnviando(true);
    try {
      const { data: r } = await responderInfoArcoPorToken(token, respuesta.trim());
      setData(r.data);
      setRespuesta('');
    } catch (err) {
      setErrorRespuesta(err.response?.data?.message || 'No se pudo enviar tu respuesta');
    } finally {
      setEnviando(false);
    }
  }

  const estado = data ? ARCO_ESTADOS[data.estado] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="card w-full max-w-lg">
        <h1 className="text-xl font-bold text-brand-700 mb-6">Seguimiento de tu solicitud ARCO</h1>

        {cargando ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-4">{error}</div>
            <Link to="/login" className="block text-center text-xs text-brand-600 hover:underline">Volver a iniciar sesión</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className={'badge ' + estado.color}>{estado.label}</span>
              <span className="text-xs text-gray-400">Folio #{data.id}</span>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5 text-sm">
              <p><span className="text-gray-500">Tipo de solicitud:</span> <span className="font-medium">{ARCO_TIPO_ETIQUETA[data.tipo]}</span></p>
              <p><span className="text-gray-500">Recibida:</span> {fmtFechaHora(data.recibidaEn)}</p>
              {data.fechaLimite && <p><span className="text-gray-500">Plazo de respuesta:</span> {fmtDia(data.fechaLimite)}</p>}
            </div>

            {data.estado === 'PENDIENTE' && !data.resultado && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
                Tu correo quedó confirmado y tu solicitud está en revisión. Te avisaremos por correo cuando tengamos respuesta.
              </div>
            )}

            {data.estado === 'INFO_SOLICITADA' && (
              <div className="space-y-3">
                <div className="bg-orange-50 border border-orange-200 text-orange-900 text-sm rounded-lg px-4 py-3 space-y-1">
                  <p className="font-semibold">Necesitamos más información de tu parte:</p>
                  <p className="whitespace-pre-wrap">{data.infoSolicitada}</p>
                  {data.infoFechaLimite && <p className="text-xs text-orange-700">Respóndenos antes del {fmtDia(data.infoFechaLimite)}.</p>}
                </div>
                <form onSubmit={handleResponder} className="space-y-2">
                  <textarea className="input" rows={3} maxLength={2000} value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe tu respuesta aquí" />
                  {errorRespuesta && <p className="text-red-600 text-xs">{errorRespuesta}</p>}
                  <button type="submit" className="btn-primary w-full" disabled={enviando}>
                    {enviando ? 'Enviando...' : 'Enviar respuesta'}
                  </button>
                </form>
              </div>
            )}

            {data.resultado && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                <p className="font-semibold text-gray-800">Respuesta: {data.resultado}</p>
                {data.respuesta && <p className="text-gray-600 whitespace-pre-wrap">{data.respuesta}</p>}
                {data.fundamento && <p className="text-gray-500 text-xs whitespace-pre-wrap">Motivo: {data.fundamento}</p>}
                {data.respondidaEn && <p className="text-xs text-gray-400">Respondida el {fmtFechaHora(data.respondidaEn)}</p>}
              </div>
            )}

            {data.estado === 'COMPLETADA' && data.resumenEjecucion && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-green-800">Qué se hizo:</p>
                <p className="text-green-800 whitespace-pre-wrap">{data.resumenEjecucion}</p>
              </div>
            )}

            {data.estado === 'NO_PRESENTADA' && (
              <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-4 py-3">
                Esta solicitud se cerró porque no recibimos la información que te pedimos dentro del plazo.
                Si todavía te interesa, puedes <Link to="/arco" className="text-brand-600 hover:underline">levantar una nueva</Link>.
              </div>
            )}

            <Link to="/login" className="block text-center text-xs text-brand-600 hover:underline pt-2">Volver a iniciar sesión</Link>
          </div>
        )}
      </div>
    </div>
  );
}
