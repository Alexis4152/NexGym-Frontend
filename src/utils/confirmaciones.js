// Mensajes estandar del modal de confirmacion (NotifyContext#confirmDialog) para las
// acciones que crean o modifican registros. Regla: toda accion que guarde, modifique,
// cancele o elimine algo pide confirmacion antes de llamar al backend.

/** Alta o edicion de un registro. `que` con articulo: "el alumno", "la sucursal"... */
export function confirmarGuardado(confirmDialog, { editando, que, nombre }) {
  const etiqueta = nombre ? ` "${String(nombre).trim()}"` : '';
  return confirmDialog(
    editando ? `¿Guardar los cambios de ${que}${etiqueta}?` : `¿Registrar ${que}${etiqueta}?`,
    { title: editando ? 'Confirmar cambios' : 'Confirmar registro', confirmLabel: editando ? 'Sí, guardar' : 'Sí, registrar' },
  );
}

/** Cualquier otra accion (subir una foto, ajustar stock, abrir un corte...). */
export function confirmarAccion(confirmDialog, mensaje, { title = 'Confirmar acción', confirmLabel = 'Sí, continuar', danger = false } = {}) {
  return confirmDialog(mensaje, { title, confirmLabel, danger });
}
