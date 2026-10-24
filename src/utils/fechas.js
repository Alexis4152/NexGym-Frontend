// Fecha 'YYYY-MM-DD' en la zona horaria LOCAL del navegador. No usar
// toISOString().slice(0, 10): esa da la fecha en UTC, y en Mexico (UTC-6) a partir de las
// 6 pm ya es "manana" -- una membresia registrada en la noche quedaba con inicio al dia
// siguiente y en estado PENDIENTE.
export function fechaLocalISO(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const hoyLocal = () => fechaLocalISO(new Date());
