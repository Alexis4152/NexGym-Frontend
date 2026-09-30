/** Descripcion corta y computada de un MembresiaPlanDto (el modelo no guarda un texto
 * libre de "descripcion" -- se arma a partir de tipoPlan/duracion/clases/disciplinas). */
export function describirPlan(p) {
  const partes = [];
  if (p.tipoPlan === 'PERIODO') partes.push(`${p.duracionCantidad} ${p.duracionUnidad?.toLowerCase()}(s)`);
  else if (p.tipoPlan === 'POR_CLASES') {
    partes.push(`${p.numeroClasesIncluidas} clases`);
    if (p.duracionCantidad) partes.push(`vigencia ${p.duracionCantidad} ${p.duracionUnidad?.toLowerCase()}(s)`);
  } else if (p.tipoPlan === 'PASE') partes.push('1 clase individual');
  else if (p.tipoPlan === 'PERSONALIZADO') partes.push('Personalizado');

  partes.push(p.accesoCompleto ? 'acceso a todas las disciplinas' : (p.disciplinaNombres?.length ? p.disciplinaNombres.join(', ') : 'sin disciplinas asignadas'));
  if (p.permiteAbonos) partes.push('permite abonos');
  return partes.join(' · ');
}

/** true cuando el plan ya no tiene lugar para un alumno NUEVO (ver
 * MembresiaService#assertCupoDisponible en el backend, que es quien realmente lo
 * bloquea -- esto solo evita el viaje al servidor para el caso obvio). */
export function planLleno(p) {
  return p.limiteAlumnos != null && p.cupoDisponible === 0;
}

/** Texto de cupo para mostrar en la tarjeta del plan, o null si el plan no tiene limite. */
export function textoCupo(p) {
  if (p.limiteAlumnos == null) return null;
  return planLleno(p) ? 'Cupo lleno' : `${p.cupoDisponible} de ${p.limiteAlumnos} lugares disponibles`;
}
