import qz from 'qz-tray';
import { getVentaTicketEscPos } from '../api/ventas';
import { getMembresiaTicketEscPos } from '../api/membresias';
import { getQzCertificate, signQzData } from '../api/qz';

let securityConfigured = false;

function ensureSecurityConfigured() {
  if (securityConfigured) return;
  qz.security.setCertificatePromise((resolve, reject) => {
    getQzCertificate()
      .then((r) => resolve(r.data.data))
      .catch((err) => {
        console.error('No se pudo obtener el certificado de QZ Tray', err);
        reject(err);
      });
  }, { rejectOnFailure: true });
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    signQzData(toSign)
      .then((r) => resolve(r.data.data))
      .catch((err) => {
        console.error('No se pudo firmar la solicitud de QZ Tray', err);
        reject(err);
      });
  });
  securityConfigured = true;
}

async function ensureConnected() {
  ensureSecurityConfigured();
  if (qz.websocket.isActive()) return;
  try {
    await qz.websocket.connect({ retries: 2, delay: 1 });
  } catch (err) {
    throw new Error(
      'No se pudo conectar con QZ Tray. Verifica que este instalado y corriendo en esta computadora (https://qz.io/download/).'
    );
  }
}

const PRINTER_NAME_KEY = 'nexorasport_pos_printer_name';

export function getConfiguredPrinterName() {
  try {
    return localStorage.getItem(PRINTER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setConfiguredPrinterName(name) {
  try {
    if (name) localStorage.setItem(PRINTER_NAME_KEY, name);
    else localStorage.removeItem(PRINTER_NAME_KEY);
  } catch {
    // localStorage no disponible; se ignora
  }
}

export async function listPrinters() {
  await ensureConnected();
  return qz.printers.find();
}

export async function printVentaTicket(ventaId) {
  const res = await getVentaTicketEscPos(ventaId);
  await imprimirHex(res.data?.data);
}

// Ticket de membresia (alta en mostrador o desde apartado en linea): mismo flujo QZ Tray.
export async function printMembresiaTicket(membresiaId) {
  const res = await getMembresiaTicketEscPos(membresiaId);
  await imprimirHex(res.data?.data);
}

async function imprimirHex(hex) {
  if (!hex) throw new Error('El servidor no devolvio el contenido del ticket.');

  await ensureConnected();

  const configuredName = getConfiguredPrinterName();
  const printer = configuredName || (await qz.printers.getDefault());
  const config = qz.configs.create(printer);

  const data = [{ type: 'raw', format: 'command', flavor: 'hex', data: hex }];

  try {
    await qz.print(config, data);
  } catch (err) {
    throw new Error(
      `No se pudo imprimir el ticket (¿esta encendida y conectada la impresora "${printer}"?): ${err?.message || err}`
    );
  }
}
