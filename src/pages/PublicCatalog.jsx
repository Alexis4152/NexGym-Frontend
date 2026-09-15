import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as publicApi from '../api/public';
import { applyBrandColor } from '../utils/theme';

export default function PublicCatalog() {
  const { slug } = useParams();
  const [centro, setCentro] = useState(null);
  const [productos, setProductos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | not-found

  useEffect(() => {
    Promise.all([publicApi.getPublicCentro(slug), publicApi.getPublicProductos(slug)])
      .then(([centroRes, productosRes]) => {
        setCentro(centroRes.data.data);
        applyBrandColor(centroRes.data.data.colorPrimario);
        setProductos(productosRes.data.data);
        setStatus('ok');
      })
      .catch(() => setStatus('not-found'));
  }, [slug]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando catalogo...</div>;
  }
  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-gray-500">Este catalogo no esta disponible.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-700 text-white px-6 py-8 text-center">
        {centro.logoUrl && <img src={centro.logoUrl} alt={centro.nombre} className="h-14 mx-auto mb-3 rounded" />}
        <h1 className="text-2xl font-bold">{centro.nombre}</h1>
        {centro.telefono && <p className="text-brand-100 text-sm mt-1">{centro.telefono}</p>}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tienda</h2>
        {productos.length === 0 ? (
          <p className="text-sm text-gray-500">Aun no hay productos publicados.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productos.map((p) => (
              <div key={p.id} className="card">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {p.imagenUrl ? (
                    <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🛍️</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                {p.categoriaNombre && <p className="text-xs text-gray-400">{p.categoriaNombre}</p>}
                {p.precioVenta != null && (
                  <p className="text-brand-700 font-semibold mt-1">${Number(p.precioVenta).toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
