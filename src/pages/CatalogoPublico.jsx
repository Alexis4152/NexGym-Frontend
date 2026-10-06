import { useEffect, useState } from 'react';
import * as inventarioApi from '../api/inventario';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import api from '../api/axios';

export default function CatalogoPublico() {
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

  // El catalogo publico independiente ya no existe (seccion 38 del encargo): la tienda de
  // apartados en /tienda/:slug lo reemplazo por completo, asi que este link YA NO usa
  // /apartar/ (ruta vieja, eliminada) sino /tienda/.
  const apartadosUrl = centro?.slugPublico ? `${window.location.origin}/tienda/${centro.slugPublico}` : null;

  function copyLink() {
    navigator.clipboard.writeText(apartadosUrl);
    notify('Link copiado al portapapeles', 'success');
  }

  async function abrirArchivoApartados(tipo) {
    const ruta = tipo === 'qr' ? 'apartados-qr.png' : 'apartados-promo.pdf';
    try {
      const { data } = await api.get(`/centros/${centroId}/${ruta}`, { params: { url: apartadosUrl }, responseType: 'blob' });
      window.open(URL.createObjectURL(data), '_blank');
    } catch {
      notify('No se pudo generar el archivo', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Catálogo público</h1>

      {centro?.apartadosActivo && centro?.slugPublico && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-2">Apartados en linea</h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input className="input flex-1 min-w-[220px]" readOnly value={apartadosUrl} />
            <button className="btn-secondary" onClick={copyLink}>Copiar link</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => abrirArchivoApartados('qr')}>
              Ver codigo QR
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => abrirArchivoApartados('pdf')}>
              Descargar folleto (PDF)
            </button>
          </div>
        </div>
      )}

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
