const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

// Modo simple (compatibilidad con todas las pantallas que ya usaban este componente):
// sin selector de tamaño ni conteo, se oculta si solo hay una pagina.
// Modo extendido (homologado con DemoPV): se activa pasando `size` + `onSizeChange` +
// `totalElements` -- agrega el selector "Mostrar N por pagina" y siempre se muestra
// (incluso con 0 resultados). DemoPV no tiene un solo componente de paginacion: cada
// pantalla repite el mismo bloque con pequeñas variantes -- por eso `pageSizes` y
// `countMode` dejan clonar exactamente la variante de cada pantalla sin duplicar el
// bloque completo aqui:
//  - Sales.jsx: pageSizes [10,20,50,100], conteo "X-Y de Z" (countMode="range", default)
//  - Apartados.jsx: pageSizes [10,20,50], conteo "Z en total" (countMode="total")
export default function Pagination({
  page, totalPages, onChange, size, onSizeChange, totalElements,
  pageSizes = DEFAULT_PAGE_SIZES, countMode = 'range',
}) {
  const extendido = size != null && onSizeChange != null;

  if (!extendido) {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
        <span>
          Pagina {page + 1} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page <= 0} onClick={() => onChange(page - 1)}>
            Anterior
          </button>
          <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  const total = totalElements ?? 0;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, page * size + size);
  const conteo = total === 0 ? 'sin resultados' : countMode === 'total' ? `${total} en total` : `${from}–${to} de ${total}`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <span>Mostrar</span>
        <select
          className="input !w-auto py-1"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        >
          {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>por página · {conteo}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
          disabled={page === 0}
          onClick={() => onChange(Math.max(0, page - 1))}
        >
          ‹ Anterior
        </button>
        <span className="text-gray-500 text-xs">Página {totalPages === 0 ? 0 : page + 1} de {totalPages}</span>
        <button
          className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
          disabled={page + 1 >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente ›
        </button>
      </div>
    </div>
  );
}
