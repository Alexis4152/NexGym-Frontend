// Catálogos de ARCO compartidos por el formulario público, "Mis solicitudes" y la
// administración (Ley Federal de Protección de Datos Personales en Posesión de los Particulares).

export const ARCO_TIPOS = [
  ['ACCESO', 'Acceso', 'Quiero saber qué datos personales míos tienen y para qué los usan.'],
  ['RECTIFICACION', 'Rectificación', 'Mis datos están incompletos o tienen un error y quiero corregirlos.'],
  ['CANCELACION', 'Cancelación', 'Quiero que eliminen mis datos personales.'],
  ['OPOSICION', 'Oposición', 'No quiero que usen mis datos para algo en particular.'],
  ['REVOCACION', 'Revocación', 'Quiero revocar un consentimiento que ya había dado.'],
  ['LIMITACION', 'Limitación', 'Quiero limitar un uso o divulgación específica de mis datos.'],
];

export const ARCO_TIPO_ETIQUETA = Object.fromEntries(ARCO_TIPOS.map(([v, l]) => [v, l]));

// Los que exponen o alteran datos: piden contraseña desde la cuenta, o identidad verificada por el SUPER_ADMIN.
export const ARCO_TIPOS_IDENTIDAD_FUERTE = ['ACCESO', 'RECTIFICACION', 'CANCELACION', 'REVOCACION'];

export const ARCO_ESTADOS = {
  PENDIENTE_CORREO: { label: 'Falta confirmar correo', color: 'bg-gray-100 text-gray-600' },
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  INFO_SOLICITADA: { label: 'Esperando información', color: 'bg-orange-100 text-orange-700' },
  APROBADA: { label: 'Aprobada, falta ejecutar', color: 'bg-blue-100 text-blue-700' },
  COMPLETADA: { label: 'Completada', color: 'bg-green-100 text-green-800' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  NO_PRESENTADA: { label: 'No presentada', color: 'bg-gray-100 text-gray-500' },
};

export const ARCO_CANALES = {
  WEB: 'Formulario público',
  CUENTA: 'Cuenta propia',
  MOSTRADOR: 'Mostrador',
};

export const ARCO_METODOS_IDENTIDAD = {
  EN_PERSONA: 'En persona',
  TELEFONO: 'Por teléfono',
  CONTRASENA: 'Contraseña',
  OTRO: 'Otro',
};

// Guía operativa para el SUPER_ADMIN: qué significa cada derecho y dónde resolverlo en
// NexoraSport. No sustituye criterio legal.
export const ARCO_GUIA = {
  ACCESO: {
    significa: 'La persona quiere saber qué datos personales suyos tiene el sistema y para qué se usan.',
    comoResolver: 'Verifica su identidad y responde PROCEDENTE. Al ejecutar, el sistema arma solo un resumen de sus datos (cuenta, fichas de alumno, ventas y apartados) y lo manda en la constancia.',
  },
  RECTIFICACION: {
    significa: 'Sus datos están incompletos o tienen un error y quiere que los corrijas.',
    comoResolver: 'Verifica su identidad. Si es alumno, corrige su ficha en Alumnos (en su centro); si es personal, en Usuarios. Un ticket de venta ya emitido normalmente no se toca. Describe en la ejecución qué corregiste.',
  },
  CANCELACION: {
    significa: 'Quiere que elimines sus datos personales.',
    comoResolver: 'Verifica su identidad. Al ejecutar, si tiene cuenta de acceso el sistema la desactiva solo. Si es alumno, dale de baja en Alumnos. Ventas, pagos y membresías se conservan por obligación fiscal: descríbelo así en la ejecución.',
  },
  OPOSICION: {
    significa: 'No quiere que uses sus datos para algo en particular (por ejemplo avisos o promociones).',
    comoResolver: 'Identifica el uso puntual y detenlo a mano (por ejemplo, quítalo de las notificaciones). Un uso ya consumado no se puede deshacer. Describe en la ejecución qué uso se detuvo.',
  },
  REVOCACION: {
    significa: 'Quiere revocar un consentimiento que había dado para tratar sus datos.',
    comoResolver: 'Verifica su identidad. Revisa para qué dio consentimiento y detenlo a mano. Describe en la ejecución qué se revocó.',
  },
  LIMITACION: {
    significa: 'Quiere limitar un uso o divulgación específica de sus datos, sin cancelarlos.',
    comoResolver: 'Identifica el uso o divulgación y acótalo a mano. Describe en la ejecución qué límite se aplicó.',
  },
};

export const fmtFechaHora = (d) => (d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const fmtDia = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—');
