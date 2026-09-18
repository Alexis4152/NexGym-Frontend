import { useEffect, useState } from 'react';
import * as inventarioApi from '../api/inventario';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import api from '../api/axios';
import VentaPos from './VentaPos.jsx';
import CortesCaja from './CortesCaja.jsx';
import Apartados from './Apartados.jsx';

export default function Tienda() {
  const { user, actingCentroId } = useAuth();
  const [tab, setTab] = useState('catalogo');
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

  async function abrirArchivoApartados(tipo) {
    const apartarUrl = `${window.location.origin}/apartar/${centro.slugPublico}`;
    const ruta = tipo === 'qr' ? 'apartados-qr.png' : 'apartados-promo.pdf';
    try {
      const { data } = await api.get(`/centros/${centroId}/${ruta}`, { params: { url: apartarUrl }, responseType: 'blob' });
      window.open(URL.createObjectURL(data), '_blank');
    } catch {
      notify('No se pudo generar el archivo', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Tienda</h1>

      <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <button className={'pb-2 ' + (tab === 'catalogo' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('catalogo')}>
          Catalogo
        </button>
        <button className={'pb-2 ' + (tab === 'vender' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('vender')}>
          Vender
        </button>
        <button className={'pb-2 ' + (tab === 'cortes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('cortes')}>
          Cortes de caja
        </button>
        <button className={'pb-2 ' + (tab === 'apartados' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('apartados')}>
          Apartados
        </button>
      </div>

      {tab === 'vender' && <VentaPos />}
      {tab === 'cortes' && <CortesCaja />}
      {tab === 'apartados' && <Apartados />}

      {tab === 'catalogo' && (
      <>
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

      {centro?.apartadosActivo && centro?.slugPublico && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-2">Apartados en linea</h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input className="input flex-1 min-w-[220px]" readOnly value={`${window.location.origin}/apartar/${centro.slugPublico}`} />
            <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/apartar/${centro.slugPublico}`); notify('Link copiado al portapapeles', 'success'); }}>
              Copiar link
            </button>
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
      </>
      )}
    </div>
  );
}
