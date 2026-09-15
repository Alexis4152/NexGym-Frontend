export default function Pagination({ page, totalPages, onChange }) {
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
