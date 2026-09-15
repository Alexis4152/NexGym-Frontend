import { useEffect, useState } from 'react';
import * as inventarioApi from '../api/inventario';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';

export default function Tienda() {
  const { user, actingCentroId } = useAuth();
  const [productos, setProductos] = useState([]);
  const [centro, setCentro] = useState(null);
  const { notify } = useNotify();

  const centroId = user?.centroId || actingCentroId;

  useEffect(() => {
    inventarioApi.listArticulos('', 0, 100).then(({ data }) =>
      setProductos(data.data.content.filter((a) => a.vendible))
    );
    if (centroId) centrosApi.getCentro(centroId).then(({ data }) => setCentro(data.data));
  }, [centroId]);

  const publicUrl = centro?.slugPublico ? `${window.location.origin}/tienda/${centro.slugPublico}` : null;

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    notify('Link copiado al portapapeles', 'success');
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Tienda</h1>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Catalogo publico</h2>
        {!centro?.catalogoPublicoActivo ? (
          <p className="text-sm text-gray-500">
            El catalogo publico esta desactivado. Actívalo desde{' '}
            <span className="text-brand-600">Configuracion del centro</span> para compartir tu tienda por link o QR.
          </p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input className="input flex-1 min-w-[220px]" readOnly value={publicUrl} />
              <button className="btn-secondary" onClick={copyLink}>Copiar link</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="btn-secondary text-sm" target="_blank" rel="noreferrer"
                 href={`https://wa.me/?text=${encodeURIComponent('Mira nuestro catalogo: ' + publicUrl)}`}>
                WhatsApp
              </a>
              <a className="btn-secondary text-sm" target="_blank" rel="noreferrer"
                 href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}>
                Facebook
              </a>
              <a className="btn-secondary text-sm" target="_blank" rel="noreferrer"
                 href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`}>
                Ver / descargar QR
              </a>
            </div>
          </div>
        )}
      </div>

      <h2 className="font-semibold text-gray-800 mb-3">Productos publicados ({productos.length})</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {productos.map((p) => (
          <div key={p.id} className="card">
            <p className="font-medium text-gray-800 truncate">{p.nombre}</p>
            <p className="text-xs text-gray-400">{p.categoriaNombre || 'Sin categoria'}</p>
            <p className="text-brand-700 font-semibold mt-1">${Number(p.precioVenta ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Stock: {p.stock}</p>
          </div>
        ))}
        {productos.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full">
            Aun no hay productos marcados como "vendible". Actívalo desde Inventario.
          </p>
        )}
      </div>
    </div>
  );
}
