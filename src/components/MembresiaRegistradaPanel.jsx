import { useEffect, useState } from 'react';
import { useNotify } from '../context/NotifyContext.jsx';
import { generarQrDataUrl } from '../utils/qr.js';
import { printMembresiaTicket } from '../utils/printer';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// Paso final despues de dar de alta una membresia en mostrador (formulario normal o
// apartado en linea): cambio a entregar, (1) QR del alumno si es nuevo -- para imprimirlo y
// que ya pueda usarlo en Asistencia/POS -- y (2) ticket de la membresia en la termica.
export default function MembresiaRegistradaPanel({ membresiaId, alumnoNuevo, cambio, onListo }) {
  const { notify } = useNotify();
  const [qrImagen, setQrImagen] = useState(null);
  const [qrImpreso, setQrImpreso] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [ticketImpreso, setTicketImpreso] = useState(false);

  useEffect(() => {
    if (alumnoNuevo?.codigoQr) generarQrDataUrl(alumnoNuevo.codigoQr).then(setQrImagen);
  }, [alumnoNuevo?.codigoQr]);

  function imprimirQr() {
    const w = window.open('', '_blank', 'width=400,height=500');
    if (!w) { notify('Permite las ventanas emergentes para imprimir el QR', 'error'); return; }
    w.document.write(`
      <html><head><title>QR - ${alumnoNuevo.nombre}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:24px">
        <h3 style="margin:0 0 4px">${alumnoNuevo.nombre}</h3>
        <p style="margin:0 0 12px;color:#666;font-size:12px">Código de acceso</p>
        <img src="${qrImagen}" style="width:240px;height:240px;" />
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body></html>`);
    w.document.close();
    setQrImpreso(true);
  }

  async function imprimirTicket() {
    setImprimiendo(true);
    try {
      await printMembresiaTicket(membresiaId);
      setTicketImpreso(true);
      notify('Ticket enviado a la impresora', 'success');
    } catch (err) {
      notify(err.response?.data?.message || err.message || 'No se pudo imprimir el ticket', 'error');
    } finally {
      setImprimiendo(false);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <div>
        <p className="text-4xl mb-1">✅</p>
        <p className="font-semibold text-gray-800">Membresía dada de alta</p>
      </div>

      {Number(cambio) > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <p className="text-sm text-emerald-700">Cambio a entregar</p>
          <p className="text-3xl font-bold text-emerald-700">{fmt(cambio)}</p>
        </div>
      )}

      {alumnoNuevo && (
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">① QR de acceso de {alumnoNuevo.nombre}</p>
          {qrImagen
            ? <img src={qrImagen} alt="QR del alumno" className="w-40 h-40 mx-auto border border-gray-200 rounded-lg" />
            : <p className="text-xs text-gray-400">Generando QR...</p>}
          <button type="button" className={(qrImpreso ? 'btn-secondary' : 'btn-primary') + ' w-full mt-2'} disabled={!qrImagen} onClick={imprimirQr}>
            🖨️ {qrImpreso ? 'Reimprimir QR' : 'Imprimir QR'}
          </button>
          {alumnoNuevo.email && <p className="text-[11px] text-gray-400 mt-1">También se envió a {alumnoNuevo.email}</p>}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">{alumnoNuevo ? '② ' : ''}Ticket de la membresía</p>
        <button type="button" className={((alumnoNuevo && !qrImpreso) || ticketImpreso ? 'btn-secondary' : 'btn-primary') + ' w-full'}
          disabled={imprimiendo} onClick={imprimirTicket}>
          🧾 {imprimiendo ? 'Imprimiendo...' : ticketImpreso ? 'Reimprimir ticket' : 'Imprimir ticket'}
        </button>
      </div>

      <button type="button" className="btn-secondary w-full" onClick={onListo}>Listo</button>
    </div>
  );
}
