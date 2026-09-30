import QRCode from 'qrcode';

/** Genera el QR de un alumno (su codigoQr) como data URL (PNG), lista para <img src>,
 * descargar o imprimir. Se genera en el cliente -- el backend solo guarda el token. */
export const generarQrDataUrl = (texto) => QRCode.toDataURL(texto, { width: 240, margin: 1 });
