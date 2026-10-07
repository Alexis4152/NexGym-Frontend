import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as publicApi from '../api/public';
import { applyBrandColor } from '../utils/theme';
import { describirPlan, planLleno } from '../utils/planes';
import Modal from '../components/Modal.jsx';

// Busqueda por texto en Google Maps (no se guardan coordenadas, solo la direccion de la
// sucursal) -- funciona igual de bien con una direccion parcial que con una completa.
function googleMapsUrl(direccion) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

// A diferencia del panel de administracion (ver utils/planes.js#textoCupo, que SI muestra
// el numero exacto de inscritos/cupo a Recepcion/Encargado/Dueno), la tienda publica nunca
// expone cuantos lugares hay ni cuantos quedan -- solo si todavia se puede apartar o no
// (seccion 40 del encargo).
function textoDisponibilidadPublica(p) {
  return planLleno(p) ? 'Cupo lleno' : 'Disponible';
}

const PORCENTAJE_ANTICIPO_PLAN = 0.2;
function validarTelefono(t) {
  return /^(?=(?:.*\d){7,})[0-9+\-\s()]+$/.test(t);
}
function validarEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

const emptyPlanCliente = { nombre: '', telefono: '', email: '', notas: '' };
const emptyTarjeta = { numero: '', vencimiento: '', cvv: '', nombre: '' };

export default function PublicApartar() {
  const { slug } = useParams();
  const [centro, setCentro] = useState(null);
  const [productos, setProductos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | not-found
  const [tab, setTab] = useState('productos'); // productos | planes -- por defecto entra a la tienda
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSel, setCategoriaSel] = useState(null); // null = "Todas"
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
  // Paso obligatorio de "en que sucursal lo recoges" (seccion 38 del encargo): se abre
  // al dar "+ Apartar", no se muestra en la tarjeta -- { producto, elegidaId } o null.
  const [modalSucursal, setModalSucursal] = useState(null);
  // Vista ampliada de un producto (seccion 39 del encargo): la foto mas grande + "+ Apartar"
  // al lado -- se abre al seleccionar el producto, independiente del boton de la tarjeta.
  const [modalDetalle, setModalDetalle] = useState(null);
  // Apartar un plan de membresia (seccion 41 del encargo): anticipo del 20% con tarjeta,
  // pago SIMULADO (no hay pasarela conectada todavia) -- el modal solo pide los datos de
  // la tarjeta para mostrar el flujo, nunca se envian al backend.
  const [modalPlan, setModalPlan] = useState(null); // el plan que se esta apartando, o null
  const [planCliente, setPlanCliente] = useState(emptyPlanCliente);
  const [tarjeta, setTarjeta] = useState(emptyTarjeta);
  const [enviandoPlan, setEnviandoPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState('');
  const [exitoPlan, setExitoPlan] = useState(null);

  useEffect(() => {
    Promise.all([publicApi.getPublicCentro(slug), publicApi.getPublicApartables(slug), publicApi.getPublicPlanes(slug)])
      .then(([centroRes, productosRes, planesRes]) => {
        setCentro(centroRes.data.data);
        applyBrandColor(centroRes.data.data.colorPrimario);
        setProductos(productosRes.data.data);
        setPlanes(planesRes.data.data);
        setStatus('ok');
      })
      .catch(() => setStatus('not-found'));
  }, [slug]);

  // Categorias distintas presentes en los productos cargados, para armar los chips de
  // filtro (patron de DemoPV) sin depender de un endpoint de categorias aparte.
  const categorias = useMemo(() => {
    const set = new Set();
    productos.forEach((p) => (p.categoriaNombres || []).forEach((c) => set.add(c)));
    return [...set].sort();
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const coincideCategoria = !categoriaSel || (p.categoriaNombres || []).includes(categoriaSel);
      const coincideBusqueda = !q || p.nombre.toLowerCase().includes(q);
      return coincideCategoria && coincideBusqueda;
    });
  }, [productos, busqueda, categoriaSel]);

  // "+ Apartar" ya NO agrega directo: abre el paso obligatorio de elegir sucursal (seccion
  // 38 del encargo) -- solo las que tienen existencia, nunca muestra cuanto hay.
  function abrirSeleccionSucursal(producto) {
    setModalSucursal({ producto, elegidaId: null });
  }

  function confirmarSucursal() {
    const { producto, elegidaId } = modalSucursal;
    const suc = producto.sucursales.find((s) => s.sucursalId === elegidaId);
    if (!suc || suc.stock === 0) return;
    setCart((prev) => {
      const existente = prev.find((i) => i.articuloId === suc.articuloId);
      if (existente) {
        if (existente.cantidad >= suc.stock) return prev;
        return prev.map((i) => (i.articuloId === suc.articuloId ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, {
        articuloId: suc.articuloId, nombre: producto.nombre, sucursalNombre: suc.sucursalNombre,
        sucursalDireccion: suc.sucursalDireccion, precio: producto.precioConDescuento, stock: suc.stock, cantidad: 1,
      }];
    });
    setModalSucursal(null);
  }

  function quitar(articuloId) {
    setCart((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  function cambiarCantidad(articuloId, cantidad) {
    setCart((prev) => prev.map((i) => (i.articuloId === articuloId ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i)));
  }

  const total = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const telefonoValido = validarTelefono(clienteTelefono);

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

  function abrirApartarPlan(plan) {
    setModalPlan(plan);
    setPlanCliente(emptyPlanCliente);
    setTarjeta(emptyTarjeta);
    setErrorPlan('');
  }

  async function confirmarApartadoPlan(e) {
    e.preventDefault();
    setErrorPlan('');
    if (!planCliente.nombre.trim()) {
      setErrorPlan('Tu nombre es obligatorio');
      return;
    }
    if (!validarTelefono(planCliente.telefono)) {
      setErrorPlan('Ingresa un telefono valido');
      return;
    }
    if (!validarEmail(planCliente.email)) {
      setErrorPlan('Ingresa un correo valido');
      return;
    }
    if (!tarjeta.numero.trim() || !tarjeta.vencimiento.trim() || !tarjeta.cvv.trim() || !tarjeta.nombre.trim()) {
      setErrorPlan('Completa los datos de la tarjeta');
      return;
    }
    setEnviandoPlan(true);
    try {
      // Los datos de la tarjeta NUNCA se envian al backend -- este pago es simulado (no hay
      // pasarela conectada todavia), solo se piden para mostrar el flujo completo.
      const { data } = await publicApi.crearPublicApartadoPlan(slug, {
        planId: modalPlan.id,
        clienteNombre: planCliente.nombre,
        clienteTelefono: planCliente.telefono,
        clienteEmail: planCliente.email,
        notas: planCliente.notas || null,
      });
      setExitoPlan(data.data);
      setModalPlan(null);
    } catch (err) {
      setErrorPlan(err.response?.data?.message || 'No se pudo procesar tu apartado, intenta de nuevo');
    } finally {
      setEnviandoPlan(false);
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6 border-b border-gray-200 mb-6 text-sm">
          <button
            type="button"
            className={'pb-2 ' + (tab === 'productos' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
            onClick={() => setTab('productos')}
          >
            🛍️ Productos
          </button>
          <button
            type="button"
            className={'pb-2 ' + (tab === 'planes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
            onClick={() => setTab('planes')}
          >
            📋 Planes
          </button>
        </div>

        {tab === 'planes' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Planes de membresia</h2>
            <p className="text-sm text-gray-500 mb-4">
              Conoce las opciones disponibles — apartalas con un anticipo del 20% pagado con tarjeta.
            </p>
            {exitoPlan && (
              <div className="card mb-4 border border-emerald-200 bg-emerald-50">
                <p className="font-semibold text-emerald-800">✅ Apartado registrado — folio #{exitoPlan.id}</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Se cobro un anticipo de ${Number(exitoPlan.montoAnticipo).toFixed(2)} con tarjeta (de ${Number(exitoPlan.precioPlan).toFixed(2)} del plan).
                  El equipo de {centro.nombre} se pondra en contacto contigo para completar tu inscripcion.
                </p>
                <button type="button" className="text-xs text-emerald-700 underline mt-2" onClick={() => setExitoPlan(null)}>Cerrar</button>
              </div>
            )}
            {planes.length === 0 ? (
              <p className="text-sm text-gray-500">Aun no hay planes publicados.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {planes.map((p) => (
                  <div key={p.id} className="card">
                    <p className="font-semibold text-gray-800">{p.nombre}</p>
                    <p className="text-brand-700 font-bold text-lg mt-1">${Number(p.precio).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-2">{describirPlan(p)}</p>
                    {p.limiteAlumnos != null && (
                      <p className={'text-xs mt-2 font-medium ' + (planLleno(p) ? 'text-red-600' : 'text-emerald-600')}>
                        {textoDisponibilidadPublica(p)}
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn-secondary text-xs w-full mt-3"
                      disabled={planLleno(p)}
                      onClick={() => abrirApartarPlan(p)}
                    >
                      {planLleno(p) ? 'Cupo lleno' : 'Apartar este plan'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos disponibles para apartar</h2>
          <input
            className="input mb-3"
            placeholder="🔍 Buscar producto por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {categorias.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                type="button"
                className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (categoriaSel === null ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-700 border-brand-200')}
                onClick={() => setCategoriaSel(null)}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (categoriaSel === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-700 border-brand-200')}
                  onClick={() => setCategoriaSel(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {productosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-500">Ningun producto coincide con tu busqueda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {productosFiltrados.map((p) => {
                const fotos = p.imagenes?.length ? p.imagenes : (p.imagenUrl ? [p.imagenUrl] : []);
                const indice = Math.min(imagenActiva[p.id] || 0, fotos.length - 1);
                return (
                <div key={p.id} className="card">
                  <div
                    className="aspect-square bg-gray-100 rounded-lg mb-1 overflow-hidden flex items-center justify-center cursor-pointer"
                    onClick={() => setModalDetalle(p)}
                  >
                    {fotos.length > 0 ? (
                      <img src={fotos[indice]} alt={p.nombre} className="w-full h-full object-contain" />
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
                  <p className="text-sm font-medium text-gray-800 truncate cursor-pointer hover:underline" onClick={() => setModalDetalle(p)}>{p.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-brand-700 font-semibold">${Number(p.precioConDescuento).toFixed(2)}</p>
                    {p.descuentoPorcentaje > 0 && (
                      <p className="text-xs text-gray-400 line-through">${Number(p.precioVenta).toFixed(2)}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {p.stockTotal > 0 ? `Disponibles: ${p.stockTotal}` : 'Sin stock disponible'}
                  </p>
                  <button type="button" className="btn-secondary text-xs w-full" disabled={p.stockTotal === 0} onClick={() => abrirSeleccionSucursal(p)}>
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
                    {i.sucursalNombre && (
                      <p className="text-[10px] text-gray-400">
                        Recoger en: {i.sucursalNombre}
                        {i.sucursalDireccion && (
                          <> · <a href={googleMapsUrl(i.sucursalDireccion)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">ver mapa</a></>
                        )}
                      </p>
                    )}
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
        </div>
        )}
      </main>

      {modalDetalle && (() => {
        const fotos = modalDetalle.imagenes?.length ? modalDetalle.imagenes : (modalDetalle.imagenUrl ? [modalDetalle.imagenUrl] : []);
        const indice = Math.min(imagenActiva[modalDetalle.id] || 0, fotos.length - 1);
        return (
          <Modal title={modalDetalle.nombre} onClose={() => setModalDetalle(null)} wide>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {fotos.length > 0 ? (
                    <img src={fotos[indice]} alt={modalDetalle.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-5xl">🛍️</span>
                  )}
                </div>
                {fotos.length > 1 && (
                  <div className="flex gap-1 justify-center mt-2">
                    {fotos.map((foto, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setImagenActiva((prev) => ({ ...prev, [modalDetalle.id]: i }))}
                        className={'w-2.5 h-2.5 rounded-full ' + (i === indice ? 'bg-brand-600' : 'bg-gray-300')}
                        aria-label={`Foto ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                {modalDetalle.categoriaNombre && (
                  <p className="text-xs text-gray-400 mb-1">{modalDetalle.categoriaNombre}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-brand-700 font-bold text-2xl">${Number(modalDetalle.precioConDescuento).toFixed(2)}</p>
                  {modalDetalle.descuentoPorcentaje > 0 && (
                    <p className="text-sm text-gray-400 line-through">${Number(modalDetalle.precioVenta).toFixed(2)}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {modalDetalle.stockTotal > 0 ? `Disponibles: ${modalDetalle.stockTotal}` : 'Sin stock disponible'}
                </p>
                <button
                  type="button"
                  className="btn-primary w-full mt-auto"
                  disabled={modalDetalle.stockTotal === 0}
                  onClick={() => { const p = modalDetalle; setModalDetalle(null); abrirSeleccionSucursal(p); }}
                >
                  + Apartar
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {modalSucursal && (
        <Modal title={`¿En que sucursal quieres recoger "${modalSucursal.producto.nombre}"?`} onClose={() => setModalSucursal(null)}>
          <p className="text-xs text-gray-500 mb-3">Elige una sucursal para continuar — solo se muestran las que tienen existencia.</p>
          <div className="space-y-2 mb-4">
            {modalSucursal.producto.sucursales.filter((s) => s.stock > 0).map((s) => (
              <div
                key={s.sucursalId}
                role="radio"
                aria-checked={modalSucursal.elegidaId === s.sucursalId}
                onClick={() => setModalSucursal((prev) => ({ ...prev, elegidaId: s.sucursalId }))}
                className={'flex items-start gap-2 p-2 rounded-lg border cursor-pointer ' +
                  (modalSucursal.elegidaId === s.sucursalId ? 'border-brand-500 bg-brand-50/50' : 'border-gray-200 hover:bg-gray-50')}
              >
                <input type="radio" readOnly checked={modalSucursal.elegidaId === s.sucursalId} className="mt-1 pointer-events-none" />
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{s.sucursalNombre}</p>
                  {s.sucursalDireccion && (
                    <p className="text-xs text-gray-500">
                      {s.sucursalDireccion}{' '}
                      <a
                        href={googleMapsUrl(s.sucursalDireccion)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-600 hover:underline"
                      >
                        📍 ver mapa
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary w-full" disabled={!modalSucursal.elegidaId} onClick={confirmarSucursal}>
            Confirmar y apartar
          </button>
        </Modal>
      )}

      {modalPlan && (
        <Modal title={`Apartar "${modalPlan.nombre}"`} onClose={() => setModalPlan(null)}>
          <form onSubmit={confirmarApartadoPlan} className="space-y-3">
            <p className="text-sm text-gray-600">
              Para apartar este plan se cobra un anticipo del 20%:{' '}
              <strong>${(Number(modalPlan.precio) * PORCENTAJE_ANTICIPO_PLAN).toFixed(2)}</strong> de ${Number(modalPlan.precio).toFixed(2)}.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
              <input className="input" value={planCliente.nombre} onChange={(e) => setPlanCliente((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefono *</label>
              <input className="input" value={planCliente.telefono} onChange={(e) => setPlanCliente((p) => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo *</label>
              <input className="input" type="email" value={planCliente.email} onChange={(e) => setPlanCliente((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} maxLength={100} value={planCliente.notas} onChange={(e) => setPlanCliente((p) => ({ ...p, notas: e.target.value }))} />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-700">Pago con tarjeta</p>
            <p className="text-[11px] text-gray-400 -mt-2">
              Modo de prueba: todavia no esta conectado a ningun banco, es solo para mostrar el flujo.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numero de tarjeta</label>
              <input className="input" placeholder="4111 1111 1111 1111" maxLength={19}
                value={tarjeta.numero} onChange={(e) => setTarjeta((t) => ({ ...t, numero: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
                <input className="input" placeholder="MM/AA" maxLength={5}
                  value={tarjeta.vencimiento} onChange={(e) => setTarjeta((t) => ({ ...t, vencimiento: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                <input className="input" placeholder="123" maxLength={4}
                  value={tarjeta.cvv} onChange={(e) => setTarjeta((t) => ({ ...t, cvv: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre en la tarjeta</label>
              <input className="input" value={tarjeta.nombre} onChange={(e) => setTarjeta((t) => ({ ...t, nombre: e.target.value }))} />
            </div>

            {errorPlan && <p className="text-xs text-red-600">{errorPlan}</p>}
            <button className="btn-primary w-full mt-2" disabled={enviandoPlan}>
              {enviandoPlan ? 'Procesando pago...' : `Pagar $${(Number(modalPlan.precio) * PORCENTAJE_ANTICIPO_PLAN).toFixed(2)} y apartar`}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
