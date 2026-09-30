import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as publicApi from '../api/public';
import { applyBrandColor } from '../utils/theme';

export default function PublicApartar() {
  const { slug } = useParams();
  const [centro, setCentro] = useState(null);
  const [productos, setProductos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | not-found
  const [cart, setCart] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);
  // indice de la foto que se muestra por producto (hasta 3, ver p.imagenes), para poder
  // hojearlas sin salir de la cuadricula de tarjetas.
  const [imagenActiva, setImagenActiva] = useState({});

  useEffect(() => {
    Promise.all([publicApi.getPublicCentro(slug), publicApi.getPublicApartables(slug)])
      .then(([centroRes, productosRes]) => {
        setCentro(centroRes.data.data);
        applyBrandColor(centroRes.data.data.colorPrimario);
        setProductos(productosRes.data.data);
        setStatus('ok');
      })
      .catch(() => setStatus('not-found'));
  }, [slug]);

  function agregar(producto) {
    setCart((prev) => {
      const existente = prev.find((i) => i.articuloId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev;
        return prev.map((i) => (i.articuloId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { articuloId: producto.id, nombre: producto.nombre, precio: producto.precioConDescuento, stock: producto.stock, cantidad: 1 }];
    });
  }

  function quitar(articuloId) {
    setCart((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  function cambiarCantidad(articuloId, cantidad) {
    setCart((prev) => prev.map((i) => (i.articuloId === articuloId ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i)));
  }

  const total = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const telefonoValido = /^(?=(?:.*\d){7,})[0-9+\-\s()]+$/.test(clienteTelefono);

  async function enviarSolicitud(e) {
    e.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError('Agrega al menos un articulo a tu apartado');
      return;
    }
    if (!clienteNombre.trim()) {
      setError('Tu nombre es obligatorio');
      return;
    }
    if (!telefonoValido) {
      setError('Ingresa un telefono valido');
      return;
    }
    setEnviando(true);
    try {
      const { data } = await publicApi.crearPublicApartado(slug, {
        clienteNombre,
        clienteTelefono,
        clienteEmail: clienteEmail || null,
        notas: notas || null,
        items: cart.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
      });
      setExito(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo enviar tu solicitud, intenta de nuevo');
    } finally {
      setEnviando(false);
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-gray-500">Los apartados no estan disponibles para esta tienda.</p>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <p className="text-4xl mb-2">✅</p>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Solicitud enviada</h1>
          <p className="text-sm text-gray-600 mb-1">Folio #{exito.id}</p>
          <p className="text-sm text-gray-600 mb-4">Total estimado: ${Number(exito.total).toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            El equipo de {centro.nombre} va a revisar tu solicitud y confirmarla. Una vez confirmada tendras
            aproximadamente {exito.horasVigenciaEstimado} horas para recogerla y pagarla en la tienda —
            <strong> no se cobra nada en linea</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-700 text-white px-6 py-8 text-center">
        {centro.logoUrl && <img src={centro.logoUrl} alt={centro.nombre} className="h-14 mx-auto mb-3 rounded" />}
        <h1 className="text-2xl font-bold">{centro.nombre}</h1>
        <p className="text-brand-100 text-sm mt-1">Aparta tus productos — pagas al recogerlos en la tienda</p>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos disponibles para apartar</h2>
          {productos.length === 0 ? (
            <p className="text-sm text-gray-500">Aun no hay productos disponibles para apartar.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {productos.map((p) => {
                const fotos = p.imagenes?.length ? p.imagenes : (p.imagenUrl ? [p.imagenUrl] : []);
                const indice = Math.min(imagenActiva[p.id] || 0, fotos.length - 1);
                return (
                <div key={p.id} className="card">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-1 overflow-hidden flex items-center justify-center">
                    {fotos.length > 0 ? (
                      <img src={fotos[indice]} alt={p.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">🛍️</span>
                    )}
                  </div>
                  {fotos.length > 1 && (
                    <div className="flex gap-1 justify-center mb-2">
                      {fotos.map((foto, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setImagenActiva((prev) => ({ ...prev, [p.id]: i }))}
                          className={'w-2 h-2 rounded-full ' + (i === indice ? 'bg-brand-600' : 'bg-gray-300')}
                          aria-label={`Foto ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-brand-700 font-semibold">${Number(p.precioConDescuento).toFixed(2)}</p>
                    {p.descuentoPorcentaje > 0 && (
                      <p className="text-xs text-gray-400 line-through">${Number(p.precioVenta).toFixed(2)}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Disponibles: {p.stock}</p>
                  <button type="button" className="btn-secondary text-xs w-full" onClick={() => agregar(p)}>
                    + Apartar
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card h-fit sticky top-4">
          <h3 className="font-semibold text-gray-800 mb-3">Mi apartado</h3>
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Aun no has agregado productos.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((i) => (
                <div key={i.articuloId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-800">{i.nombre}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <button type="button" className="w-5 h-5 rounded bg-gray-100" onClick={() => cambiarCantidad(i.articuloId, i.cantidad - 1)}>-</button>
                      <span className="text-xs w-5 text-center">{i.cantidad}</span>
                      <button type="button" className="w-5 h-5 rounded bg-gray-100" onClick={() => cambiarCantidad(i.articuloId, i.cantidad + 1)}>+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">${(i.precio * i.cantidad).toFixed(2)}</p>
                    <button type="button" className="text-red-600 text-xs" onClick={() => quitar(i.articuloId)}>Quitar</button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-gray-100">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <form onSubmit={enviarSolicitud} className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
              <input className="input" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefono *</label>
              <input className="input" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo (opcional)</label>
              <input className="input" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} maxLength={100} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-xs text-gray-400">No se cobra nada en linea — pagas al recogerlo en la tienda.</p>
            <button className="btn-primary w-full" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar solicitud de apartado'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
