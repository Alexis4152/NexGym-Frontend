import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const REGION_ID = 'camara-scanner-region';
// El mismo codigo sigue frente a la camara varios cuadros seguidos: se ignora durante
// este tiempo para no registrarlo dos veces.
const ESPERA_MISMO_CODIGO_MS = 4000;

// Abrir/cerrar la camara es asincrono y no tolera solaparse (React StrictMode monta y
// desmonta dos veces en desarrollo, o el usuario cierra y abre rapido): todo pasa en fila.
let colaCamara = Promise.resolve();

/**
 * Escaner con la camara del celular/tablet (sin lector fisico). Usa la camara trasera y se
 * queda abierto para escanear a varias personas seguidas; `onCodigo(texto)` puede ser async
 * y regresar { ok, mensaje } para mostrarlo debajo del video.
 *
 * Requisito del navegador: la camara solo se permite en https o en localhost.
 */
export default function CamaraScanner({ titulo = 'Escanear con cámara', onCodigo, onClose }) {
  const scannerRef = useRef(null);
  const ocupadoRef = useRef(false);
  const ultimoRef = useRef({ codigo: null, en: 0 });
  const onCodigoRef = useRef(onCodigo);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null); // { ok, mensaje }
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => { onCodigoRef.current = onCodigo; });

  useEffect(() => {
    if (!window.isSecureContext) {
      setError('El navegador solo permite usar la cámara en una conexión segura (https). Abre el sistema con https para escanear.');
      setIniciando(false);
      return undefined;
    }
    const scanner = new Html5Qrcode(REGION_ID, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
    });
    scannerRef.current = scanner;

    async function alLeer(texto) {
      const ahora = Date.now();
      const { codigo, en } = ultimoRef.current;
      if (ocupadoRef.current || (texto === codigo && ahora - en < ESPERA_MISMO_CODIGO_MS)) return;
      ocupadoRef.current = true;
      ultimoRef.current = { codigo: texto, en: ahora };
      if (navigator.vibrate) navigator.vibrate(80);
      try {
        const r = await onCodigoRef.current?.(texto);
        if (r) setResultado(r);
      } finally {
        ocupadoRef.current = false;
      }
    }

    let cancelado = false;
    colaCamara = colaCamara.then(async () => {
      if (cancelado) return;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => { const lado = Math.floor(Math.min(w, h) * 0.7); return { width: lado, height: lado }; } },
          alLeer,
          () => {}, // cuadros sin codigo: normal, no es error
        );
      } catch (e) {
        if (cancelado) return;
        const msg = String(e?.message || e);
        setError(/NotAllowed|Permission/i.test(msg)
          ? 'No se dio permiso para usar la cámara. Actívalo en la configuración del navegador y vuelve a intentar.'
          : /NotFound|no camera|Requested device not found/i.test(msg)
            ? 'No se encontró una cámara en este dispositivo.'
            : `No se pudo abrir la cámara: ${msg}`);
      } finally {
        if (!cancelado) setIniciando(false);
      }
    });

    return () => {
      cancelado = true;
      scannerRef.current = null;
      colaCamara = colaCamara.then(async () => {
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch { /* ya estaba cerrada */ }
      });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">📷 {titulo}</h3>
          <button type="button" className="text-gray-400 hover:text-gray-700 text-xl leading-none" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="bg-black">
          <div id={REGION_ID} className="w-full" />
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          {iniciando && <p className="text-gray-500">Abriendo cámara...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!error && !iniciando && !resultado && (
            <p className="text-gray-500">Apunta al código QR del alumno. La cámara sigue abierta para escanear al siguiente.</p>
          )}
          {resultado && (
            <p className={'rounded-lg px-3 py-2 ' + (resultado.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {resultado.ok ? '✓ ' : '✕ '}{resultado.mensaje}
            </p>
          )}
          <button type="button" className="btn-secondary w-full" onClick={onClose}>Terminar</button>
        </div>
      </div>
    </div>
  );
}
