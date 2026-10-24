import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as publicApi from '../api/public';
import { applyBrandColor } from '../utils/theme';
import { describirPlan, planLleno } from '../utils/planes';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

// Tienda publica de apartados (/tienda/:slug) -- la unica pantalla que un cliente visita SIN
// cuenta. Homologada con la vitrina de DemoPV: tres vistas internas (catalogo a todo lo
// ancho, carrito aparte con boton flotante en el encabezado, y "Consultar mi apartado" por
// folio+telefono con cancelar/editar), carrito guardado en localStorage, validacion en vivo y
// galeria con flechas. Conserva lo propio de NexGym: pestana de Planes de membresia (anticipo
// del 20% con pago simulado) y el paso obligatorio de elegir sucursal al apartar un producto.

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);
const fmtFechaHora = (d) => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

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

// Mismos 5 estados que EstadoApartado en el backend.
const ESTADO_INFO = {
  PENDIENTE: { label: 'Pendiente de revisión', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
  ACTIVO: { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: '✅' },
  COMPLETADO: { label: 'Completado', color: 'bg-blue-100 text-blue-700', icon: '🎉' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: '❌' },
  VENCIDO: { label: 'Vencido', color: 'bg-gray-200 text-gray-600', icon: '⏰' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Celular mexicano: exactamente 10 digitos, sin lada ni separadores -- se filtra tecla por
// tecla en el input, asi que el estado nunca contiene otra cosa. Mismo criterio que el
// backend (ApartadoRequest/ApartadoPlanRequest#clienteTelefono).
const DIGITOS_TELEFONO = 10;
const soloDigitos = (valor, max) => valor.replace(/\D/g, '').slice(0, max);
const PRODUCTOS_POR_PAGINA = 12;
const PORCENTAJE_ANTICIPO_PLAN = 0.2;

// Un carrito por centro (por slug), para que dos tiendas abiertas en el mismo navegador no
// se mezclen.
const claveCarrito = (slug) => `nexgym_apartado_${slug}`;

// Plazo para recoger un apartado ya confirmado, en dias si son dias completos (48h -> "2 dias").
function fmtPlazo(horas) {
  if (!horas) return 'un plazo que el centro te confirmará';
  if (horas % 24 === 0) {
    const dias = horas / 24;
    return `${dias} día${dias === 1 ? '' : 's'}`;
  }
  return `${horas} hora${horas === 1 ? '' : 's'}`;
}

function fotosDe(p) {
  if (!p) return [];
  return p.imagenes?.length ? p.imagenes : (p.imagenUrl ? [p.imagenUrl] : []);
}

// Busca, dentro del catalogo cargado, el producto y la sucursal a la que pertenece un
// articuloId (cada sucursal tiene su propio ArticuloInventario).
function ubicarArticulo(productos, articuloId) {
  for (const p of productos) {
    const suc = p.sucursales?.find((s) => s.articuloId === articuloId);
    if (suc) return { producto: p, suc };
  }
  return null;
}

function lineaCarrito(producto, suc, cantidad) {
  return {
    articuloId: suc.articuloId,
    nombre: producto.nombre,
    imagen: fotosDe(producto)[0] ?? null,
    sucursalNombre: suc.sucursalNombre,
    sucursalDireccion: suc.sucursalDireccion,
    precio: Number(producto.precioConDescuento),
    precioOriginal: Number(producto.precioVenta),
    stock: suc.stock,
    cantidad: Math.min(cantidad, suc.stock),
  };
}

/**
 * Revalida lineas {articuloId, cantidad, nombre} contra el catalogo ACTUAL: un articulo que
 * ya no existe, dejo de ser apartable o se quedo sin stock se excluye (se reporta en
 * `noDisponibles` para avisar); al resto se le actualiza precio/stock y se recorta la cantidad
 * si ya no alcanza. Lo usan restaurar el carrito guardado y "Editar" un apartado.
 */
function conciliarCarrito(productos, lineas) {
  const noDisponibles = [];
  const carrito = lineas
    .map((l) => {
      const hallado = ubicarArticulo(productos, l.articuloId);
      if (!hallado || hallado.suc.stock <= 0) {
        noDisponibles.push(l.nombre);
        return null;
      }
      return lineaCarrito(hallado.producto, hallado.suc, l.cantidad);
    })
    .filter(Boolean);
  return { carrito, noDisponibles };
}

const listaNombres = (nombres) =>
  `${nombres.join(', ')} ya no ${nombres.length === 1 ? 'está disponible' : 'están disponibles'}`;

const emptyPlanCliente = { nombre: '', telefono: '', email: '', notas: '' };
const emptyTarjeta = { numero: '', vencimiento: '', cvv: '', nombre: '' };

export default function PublicApartar() {
  const { slug } = useParams();
  const { notify, confirmDialog } = useNotify();
  const [centro, setCentro] = useState(null);
  const [productos, setProductos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | not-found
  const [mostrarInfo, setMostrarInfo] = useState(false);

  // 'catalogo' (productos/planes), 'carrito' (revisar + datos de contacto) o 'consulta'
  // (seguimiento de un apartado ya hecho). "+ Apartar" nunca cambia de vista por si solo.
  const [vista, setVista] = useState('catalogo');
  const [tab, setTab] = useState('productos'); // productos | planes (dentro de 'catalogo')
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSel, setCategoriaSel] = useState(null); // null = "Todas"
  const [pagina, setPagina] = useState(0);
  // indice de la foto que se muestra por producto, para hojearlas sin salir de la cuadricula.
  const [imagenActiva, setImagenActiva] = useState({});
  // Paso obligatorio de "en que sucursal lo recoges" (seccion 38 del encargo).
  const [modalSucursal, setModalSucursal] = useState(null); // { producto, elegidaId }
  const [modalDetalle, setModalDetalle] = useState(null);

  const [cart, setCart] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [notas, setNotas] = useState('');
  // Nombre/Telefono solo muestran "obligatorio" despues de tocarlos, para no recibir con
  // errores en rojo a quien apenas abre la pagina.
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);

  // Vista 'consulta' -- independiente del formulario del carrito.
  const [modoConsulta, setModoConsulta] = useState('folio'); // folio | telefono
  const [consultaFolio, setConsultaFolio] = useState('');
  const [consultaTelefono, setConsultaTelefono] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState('');
  const [resultado, setResultado] = useState(null);
  // Telefono que de verdad encontro `resultado` -- es el que se manda al cancelar/editar (el
  // servidor lo revalida desde cero de todas formas).
  const [telefonoVerificado, setTelefonoVerificado] = useState('');
  const [busquedaTel, setBusquedaTel] = useState('');
  const [buscandoTel, setBuscandoTel] = useState(false);
  const [errorBusquedaTel, setErrorBusquedaTel] = useState('');
  const [resultadosTel, setResultadosTel] = useState(null); // null = aun no se busco
  const [accionando, setAccionando] = useState(false);

  // Apartar un plan de membresia (seccion 41 del encargo): anticipo del 20% con tarjeta,
  // pago SIMULADO (no hay pasarela conectada todavia) -- los datos de la tarjeta nunca se
  // envian al backend.
  const [modalPlan, setModalPlan] = useState(null);
  const [planCliente, setPlanCliente] = useState(emptyPlanCliente);
  const [tarjeta, setTarjeta] = useState(emptyTarjeta);
  const [enviandoPlan, setEnviandoPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState('');
  const [exitoPlan, setExitoPlan] = useState(null);

  // Evita que el guardado en localStorage pise el carrito guardado con uno vacio antes de
  // que la restauracion (que espera a que cargue el catalogo) termine.
  const carritoRestaurado = useRef(false);

  useEffect(() => {
    carritoRestaurado.current = false;
    Promise.all([publicApi.getPublicCentro(slug), publicApi.getPublicApartables(slug), publicApi.getPublicPlanes(slug)])
      .then(([centroRes, productosRes, planesRes]) => {
        const catalogo = productosRes.data.data;
        setCentro(centroRes.data.data);
        applyBrandColor(centroRes.data.data.colorPrimario);
        setProductos(catalogo);
        setPlanes(planesRes.data.data);
        setStatus('ok');
        restaurarCarrito(catalogo);
      })
      .catch(() => setStatus('not-found'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Restaura el carrito de una visita anterior a este mismo centro, revalidado contra el
  // catalogo actual -- una recarga o una pestana cerrada no borran lo que ya se habia armado,
  // pero tampoco reaparece con precio/stock viejos.
  function restaurarCarrito(catalogo) {
    let guardado = [];
    try {
      guardado = JSON.parse(localStorage.getItem(claveCarrito(slug)) || '[]');
    } catch {
      guardado = [];
    }
    if (Array.isArray(guardado) && guardado.length > 0) {
      const { carrito, noDisponibles } = conciliarCarrito(catalogo, guardado);
      setCart(carrito);
      if (noDisponibles.length > 0) notify(`${listaNombres(noDisponibles)} y se quitó de tu apartado guardado`, 'error');
    }
    carritoRestaurado.current = true;
  }

  useEffect(() => {
    if (!carritoRestaurado.current) return;
    try {
      if (cart.length === 0) localStorage.removeItem(claveCarrito(slug));
      else localStorage.setItem(claveCarrito(slug), JSON.stringify(cart));
    } catch {
      // localStorage puede no estar disponible (navegacion privada): sin persistencia, nada mas.
    }
  }, [cart, slug]);

  // Categorias distintas presentes en los productos cargados, para los chips de filtro.
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

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const productosPagina = productosFiltrados.slice(paginaActual * PRODUCTOS_POR_PAGINA, (paginaActual + 1) * PRODUCTOS_POR_PAGINA);

  const total = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const piezasCarrito = cart.reduce((sum, i) => sum + i.cantidad, 0);

  // "+ Apartar" abre el paso obligatorio de elegir sucursal (seccion 38 del encargo) -- solo
  // las que tienen existencia, nunca muestra cuanto hay.
  function abrirSeleccionSucursal(producto) {
    const conStock = producto.sucursales.filter((s) => s.stock > 0);
    // Con una sola sucursal disponible no hay nada que elegir: se preselecciona.
    setModalSucursal({ producto, elegidaId: conStock.length === 1 ? conStock[0].sucursalId : null });
  }

  function confirmarSucursal() {
    const { producto, elegidaId } = modalSucursal;
    const suc = producto.sucursales.find((s) => s.sucursalId === elegidaId);
    if (!suc || suc.stock === 0) return;
    const existente = cart.find((i) => i.articuloId === suc.articuloId);
    if (existente && existente.cantidad >= suc.stock) {
      notify(`Ya apartaste todas las piezas disponibles de "${producto.nombre}" en ${suc.sucursalNombre}`, 'error');
      setModalSucursal(null);
      return;
    }
    setCart((prev) => (existente
      ? prev.map((i) => (i.articuloId === suc.articuloId ? { ...i, cantidad: i.cantidad + 1 } : i))
      : [...prev, lineaCarrito(producto, suc, 1)]));
    setModalSucursal(null);
    notify(`"${producto.nombre}" agregado a tu apartado`, 'success');
  }

  function cambiarCantidad(articuloId, cantidad) {
    if (cantidad < 1) {
      setCart((prev) => prev.filter((i) => i.articuloId !== articuloId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.articuloId === articuloId ? { ...i, cantidad: Math.min(cantidad, i.stock) } : i)));
  }

  // Validacion EN VIVO (mismos limites que ApartadoRequest en el backend): el mensaje aparece
  // o desaparece mientras se teclea, sin esperar a "Enviar".
  const erroresVivos = {};
  if (!clienteNombre.trim()) erroresVivos.clienteNombre = 'El nombre es obligatorio';
  else if (clienteNombre.length > 150) erroresVivos.clienteNombre = 'El nombre no puede tener más de 150 caracteres';
  if (!clienteTelefono) erroresVivos.clienteTelefono = 'El teléfono es obligatorio';
  else if (clienteTelefono.length !== DIGITOS_TELEFONO) erroresVivos.clienteTelefono = `El teléfono debe tener ${DIGITOS_TELEFONO} dígitos`;
  if (clienteEmail.trim() !== '') {
    if (!EMAIL_RE.test(clienteEmail.trim())) erroresVivos.clienteEmail = 'El correo no tiene un formato válido';
    else if (clienteEmail.length > 150) erroresVivos.clienteEmail = 'El correo no puede tener más de 150 caracteres';
  }
  if (notas.length > 100) erroresVivos.notas = 'Las notas no pueden tener más de 100 caracteres';
  const erroresCampo = { ...erroresBackend, ...erroresVivos };
  const mostrarError = (campo, valor) => erroresCampo[campo] && (tocados[campo] || valor !== '');

  async function enviarSolicitud(e) {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }
    if (Object.keys(erroresVivos).length > 0) {
      setTocados((t) => ({ ...t, clienteNombre: true, clienteTelefono: true }));
      setError('');
      notify('Revisa los campos marcados en rojo', 'error');
      return;
    }
    const ok = await confirmDialog(
      `¿Confirmas que quieres apartar ${piezasCarrito} pieza${piezasCarrito === 1 ? '' : 's'} por un total de ${fmt(total)}?`,
      { confirmLabel: 'Sí, apartar' },
    );
    if (!ok) return;
    setErroresBackend({});
    setEnviando(true);
    setError('');
    try {
      const { data } = await publicApi.crearPublicApartado(slug, {
        clienteNombre: clienteNombre.trim(),
        clienteTelefono,
        clienteEmail: clienteEmail.trim() || null,
        notas: notas.trim() || null,
        items: cart.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
      });
      // El resumen de la pantalla de exito sale del carrito tal como se envio.
      setExito({ ...data.data, items: cart });
      setCart([]);
      setClienteNombre(''); setClienteTelefono(''); setClienteEmail(''); setNotas('');
      setTocados({});
    } catch (err) {
      // Errores de @Valid llegan como { campo: mensaje } en `data` -> debajo de cada input.
      const datos = err.response?.data?.data;
      if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
        setErroresBackend(datos);
        setError('');
      } else {
        setError(err.response?.data?.message || 'No se pudo enviar tu solicitud, intenta de nuevo');
      }
    } finally {
      setEnviando(false);
    }
  }

  // ---------------------------------------------------------------- consulta
  async function consultar(e) {
    e.preventDefault();
    if (!consultaFolio.trim() || !consultaTelefono.trim()) {
      setErrorConsulta('Captura el folio y el teléfono');
      return;
    }
    setConsultando(true);
    setErrorConsulta('');
    try {
      const { data } = await publicApi.consultarPublicApartado(slug, { folio: Number(consultaFolio), telefono: consultaTelefono });
      setResultado(data.data);
      setTelefonoVerificado(consultaTelefono);
    } catch (err) {
      setResultado(null);
      setErrorConsulta(err.response?.data?.message || 'No se pudo consultar tu apartado');
    } finally {
      setConsultando(false);
    }
  }

  async function buscarPorTelefono(e) {
    e.preventDefault();
    if (!busquedaTel.trim()) {
      setErrorBusquedaTel('Captura tu teléfono');
      return;
    }
    setBuscandoTel(true);
    setErrorBusquedaTel('');
    try {
      const { data } = await publicApi.buscarPublicApartadosPorTelefono(slug, { telefono: busquedaTel });
      setResultadosTel(data.data ?? []);
    } catch (err) {
      setResultadosTel(null);
      setErrorBusquedaTel(err.response?.data?.message || 'No se pudo buscar');
    } finally {
      setBuscandoTel(false);
    }
  }

  function reiniciarConsulta() {
    setResultado(null);
    setErrorConsulta('');
    setConsultaFolio('');
    setConsultaTelefono('');
    setTelefonoVerificado('');
    setModoConsulta('folio');
    setBusquedaTel('');
    setErrorBusquedaTel('');
    setResultadosTel(null);
  }

  async function cancelarMiApartado() {
    if (!(await confirmDialog('¿Seguro que quieres cancelar tu apartado?', { confirmLabel: 'Sí, cancelar', danger: true }))) return;
    setAccionando(true);
    try {
      const { data } = await publicApi.cancelarPublicApartado(slug, { folio: resultado.folio, telefono: telefonoVerificado });
      setResultado(data.data);
      notify('Tu apartado fue cancelado', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar tu apartado', 'error');
    } finally {
      setAccionando(false);
    }
  }

  // "Editar" = cancelar este apartado (libera el stock si ya estaba confirmado) y reconstruir
  // el carrito con los mismos productos y sucursales, revalidados contra el catalogo recien
  // recargado, para mandar una solicitud NUEVA -- igual que DemoPV.
  async function editarMiApartado() {
    const ok = await confirmDialog(
      '¿Editar este apartado? Se cancelará el actual y podrás armar uno nuevo con los mismos productos.',
      { confirmLabel: 'Sí, editar' },
    );
    if (!ok) return;
    setAccionando(true);
    try {
      await publicApi.cancelarPublicApartado(slug, { folio: resultado.folio, telefono: telefonoVerificado, motivo: 'El cliente editó su apartado' });
      const { data } = await publicApi.getPublicApartables(slug);
      const catalogo = data.data;
      setProductos(catalogo);
      const lineas = resultado.items
        .filter((i) => i.articuloId != null)
        .map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad, nombre: i.articuloNombre }));
      const { carrito, noDisponibles } = conciliarCarrito(catalogo, lineas);
      setCart(carrito);
      if (noDisponibles.length > 0) notify(listaNombres(noDisponibles), 'error');
      reiniciarConsulta();
      setVista('carrito');
      notify('Apartado cancelado — ajusta los productos y envía tu nueva solicitud', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo editar tu apartado', 'error');
    } finally {
      setAccionando(false);
    }
  }

  // ---------------------------------------------------------------- planes
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
    if (planCliente.telefono.length !== DIGITOS_TELEFONO) {
      setErrorPlan(`El teléfono debe tener ${DIGITOS_TELEFONO} dígitos`);
      return;
    }
    if (!EMAIL_RE.test(planCliente.email.trim())) {
      setErrorPlan('Ingresa un correo válido');
      return;
    }
    if (!tarjeta.numero.trim() || !tarjeta.vencimiento.trim() || !tarjeta.cvv.trim() || !tarjeta.nombre.trim()) {
      setErrorPlan('Completa los datos de la tarjeta');
      return;
    }
    // Confirmacion explicita antes de cobrar el anticipo: nombra la membresia y el monto.
    const anticipo = fmt(Number(modalPlan.precio) * PORCENTAJE_ANTICIPO_PLAN);
    const ok = await confirmDialog(
      `¿Estás seguro que deseas apartar la membresía "${modalPlan.nombre}"? Se cobrará un anticipo de ${anticipo} a tu tarjeta.`,
      { confirmLabel: 'Sí, apartar y pagar', cancelLabel: 'No, revisar' },
    );
    if (!ok) return;
    setEnviandoPlan(true);
    try {
      // Los datos de la tarjeta NUNCA se envian al backend -- pago simulado.
      const { data } = await publicApi.crearPublicApartadoPlan(slug, {
        planId: modalPlan.id,
        clienteNombre: planCliente.nombre.trim(),
        clienteTelefono: planCliente.telefono,
        clienteEmail: planCliente.email.trim(),
        notas: planCliente.notas || null,
      });
      setExitoPlan(data.data);
      setModalPlan(null);
    } catch (err) {
      const datos = err.response?.data?.data;
      const primerError = datos && typeof datos === 'object' && !Array.isArray(datos) ? Object.values(datos)[0] : null;
      setErrorPlan(primerError || err.response?.data?.message || 'No se pudo procesar tu apartado, intenta de nuevo');
    } finally {
      setEnviandoPlan(false);
    }
  }

  // ---------------------------------------------------------------- render
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-xl font-bold text-gray-800">Tienda no encontrada</h1>
          <p className="text-gray-500 text-sm mt-1">Revisa el link, o este centro todavía no tiene apartados habilitados.</p>
        </div>
      </div>
    );
  }

  if (exito) {
    const horas = exito.horasVigenciaEstimado ?? centro.horasApartadoDefault;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="card max-w-md w-full text-center border-t-2 border-t-brand-500">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Apartado registrado!</h2>
          <p className="text-gray-500 text-sm mb-4">Folio #{exito.id}</p>
          <div className="text-left bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800 text-sm">¿Qué sigue?</p>
            <p>Tu solicitud queda <span className="font-medium">pendiente de revisión</span>.</p>
            <p>✅ Si hay disponibilidad, {centro.nombre} la <span className="font-medium">confirma</span>: desde ahí tienes {fmtPlazo(horas)} para recogerlo y pagarlo en la sucursal que elegiste.</p>
            <p>❌ Si algún producto ya no está disponible, te avisarán por teléfono o correo (si dejaste uno).</p>
            <p>⏰ Si se confirma y no lo recoges dentro del plazo, el apartado se libera solo y el producto vuelve a estar disponible.</p>
          </div>
          <div className="text-left bg-brand-50/60 rounded-lg p-4 mb-4 text-sm">
            {exito.items.map((i) => (
              <div key={i.articuloId} className="flex justify-between gap-3 py-1">
                <span>
                  {i.cantidad} x {i.nombre}
                  {i.sucursalNombre && <span className="block text-[11px] text-gray-400">Recoger en: {i.sucursalNombre}</span>}
                </span>
                <span className="font-medium whitespace-nowrap">{fmt(i.precio * i.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2 border-t border-brand-100 font-bold text-brand-800">
              <span>Total</span><span>{fmt(exito.total)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Guarda tu folio — con él y tu teléfono puedes consultar el estado de tu apartado cuando quieras, sin tener que llamar.
          </p>
          <button type="button" className="btn-primary w-full mb-2" onClick={() => { setExito(null); setVista('catalogo'); }}>Hacer otro apartado</button>
          <button type="button" className="btn-secondary w-full" onClick={() => { setExito(null); setVista('consulta'); }}>Consultar mi apartado</button>
        </div>
      </div>
    );
  }

  const hayInfo = centro.telefono || centro.direccion || centro.emailContacto;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        {centro.logoUrl ? (
          <img src={centro.logoUrl} alt={centro.nombre} className="w-11 h-11 rounded-full object-cover bg-white border-2 border-white/40" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl">🏋️</div>
        )}
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setVista('catalogo')}>
          <h1 className="font-bold text-white truncate">{centro.nombre}</h1>
          <p className="text-xs text-brand-100 truncate">Aparta tus productos — pagas al recogerlos</p>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0"
          onClick={() => setVista('consulta')}
        >
          📦 <span className="hidden sm:inline">Consultar apartado</span>
        </button>
        <button
          type="button"
          className="relative flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0"
          onClick={() => setVista('carrito')}
        >
          🛍️ <span className="hidden sm:inline">Mi apartado</span>
          {piezasCarrito > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {piezasCarrito}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1">
        {vista === 'carrito' ? (
          <div className="max-w-5xl mx-auto p-4">
            <button type="button" className="btn-secondary text-sm mb-4" onClick={() => setVista('catalogo')}>← Seguir comprando</button>

            {cart.length === 0 ? (
              <div className="card text-center py-12 border-t-2 border-t-brand-500">
                <p className="text-4xl mb-3">🛍️</p>
                <p className="text-gray-500 text-sm mb-4">Todavía no has agregado nada a tu apartado.</p>
                <button type="button" className="btn-primary" onClick={() => setVista('catalogo')}>Ver catálogo</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card border-t-2 border-t-brand-500">
                  <h3 className="font-bold text-brand-800 mb-4 text-lg">🛍️ Tu apartado</h3>
                  <div className="space-y-3">
                    {cart.map((i) => (
                      <div key={i.articuloId} className="flex items-start sm:items-center gap-3 sm:gap-4 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {i.imagen ? <img src={i.imagen} alt={i.nombre} className="w-full h-full object-cover" /> : <span className="text-2xl">🛍️</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="sm:flex-1 min-w-0">
                            <p className="font-medium text-gray-900 break-words">{i.nombre}</p>
                            {i.sucursalNombre && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Recoger en: <span className="text-gray-600">{i.sucursalNombre}</span>
                                {i.sucursalDireccion && (
                                  <span className="block">
                                    {i.sucursalDireccion} · <a href={googleMapsUrl(i.sucursalDireccion)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">ver mapa</a>
                                  </span>
                                )}
                              </p>
                            )}
                            <p className="text-sm text-gray-400 mt-0.5">
                              {i.precioOriginal > i.precio && <span className="line-through mr-1">{fmt(i.precioOriginal)}</span>}
                              <span className="whitespace-nowrap">{fmt(i.precio)} c/u</span>
                            </p>
                            <button type="button" className="text-xs text-red-500 hover:underline mt-1" onClick={() => cambiarCantidad(i.articuloId, 0)}>Quitar</button>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:contents">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button type="button" className="w-8 h-8 rounded border border-brand-200 text-brand-700 hover:bg-brand-50" onClick={() => cambiarCantidad(i.articuloId, i.cantidad - 1)}>−</button>
                              <span className="w-8 text-center font-medium">{i.cantidad}</span>
                              <button type="button" className="w-8 h-8 rounded border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-30" disabled={i.cantidad >= i.stock} onClick={() => cambiarCantidad(i.articuloId, i.cantidad + 1)}>+</button>
                            </div>
                            <p className="sm:w-24 text-right font-semibold text-gray-900 shrink-0">{fmt(i.precio * i.cantidad)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4 mt-4 border-t border-gray-100 font-bold text-gray-900 text-lg">
                    <span>Total</span><span>{fmt(total)}</span>
                  </div>
                </div>

                <div className="lg:col-span-1 card h-fit lg:sticky lg:top-24 border-t-2 border-t-brand-500">
                  <h3 className="font-bold text-brand-800 mb-3">Tus datos</h3>
                  <form onSubmit={enviarSolicitud} className="space-y-3" noValidate>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Tu nombre <span className={mostrarError('clienteNombre', clienteNombre) ? 'text-red-600' : ''}>*</span></label>
                      <input className="input" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)}
                        onBlur={() => setTocados((t) => ({ ...t, clienteNombre: true }))} />
                      {mostrarError('clienteNombre', clienteNombre) && <p className="text-red-600 text-xs mt-1">{erroresCampo.clienteNombre}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Teléfono <span className={mostrarError('clienteTelefono', clienteTelefono) ? 'text-red-600' : ''}>*</span></label>
                      <input className="input" inputMode="numeric" placeholder="10 dígitos, para avisarte" value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(soloDigitos(e.target.value, DIGITOS_TELEFONO))}
                        onBlur={() => setTocados((t) => ({ ...t, clienteTelefono: true }))} />
                      {mostrarError('clienteTelefono', clienteTelefono) && <p className="text-red-600 text-xs mt-1">{erroresCampo.clienteTelefono}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Correo (opcional)</label>
                      <input className="input" type="text" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
                      <p className="text-xs text-gray-400 mt-1">Ej. tucorreo@gmail.com, tucorreo@outlook.com</p>
                      {erroresCampo.clienteEmail && <p className="text-red-600 text-xs mt-1">{erroresCampo.clienteEmail}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Notas (opcional)</label>
                      <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
                      {erroresCampo.notas && <p className="text-red-600 text-xs mt-1">{erroresCampo.notas}</p>}
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <button type="submit" className="btn-primary w-full" disabled={enviando || Object.keys(erroresVivos).length > 0}>
                      {enviando ? 'Enviando...' : 'Enviar solicitud de apartado'}
                    </button>
                    <p className="text-xs text-gray-400 text-center">No se cobra nada en línea — pagas al recogerlo en la sucursal.</p>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : vista === 'consulta' ? (
          <div className="max-w-md mx-auto p-4">
            <button type="button" className="btn-secondary text-sm mb-4" onClick={() => setVista('catalogo')}>← Volver al catálogo</button>

            {!resultado && modoConsulta === 'folio' && (
              <div className="card border-t-2 border-t-brand-500">
                <h3 className="font-bold text-brand-800 mb-1">Consultar mi apartado</h3>
                <p className="text-sm text-gray-500 mb-4">Captura el folio que te dimos al solicitarlo y el teléfono con el que lo registraste.</p>
                <form onSubmit={consultar} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Folio *</label>
                    <input className="input" inputMode="numeric" placeholder="Ej. 123" value={consultaFolio}
                      onChange={(e) => setConsultaFolio(soloDigitos(e.target.value, 10))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Teléfono *</label>
                    <input className="input" inputMode="numeric" placeholder="Con el que lo registraste" value={consultaTelefono}
                      onChange={(e) => setConsultaTelefono(soloDigitos(e.target.value, DIGITOS_TELEFONO))} />
                  </div>
                  {errorConsulta && <p className="text-red-600 text-sm">{errorConsulta}</p>}
                  <button type="submit" className="btn-primary w-full" disabled={consultando}>{consultando ? 'Buscando...' : 'Consultar'}</button>
                </form>
                <button type="button" className="text-xs text-brand-700 hover:underline mt-3 block mx-auto"
                  onClick={() => { setModoConsulta('telefono'); setErrorConsulta(''); }}>
                  ¿No tienes tu folio? Búscalo por tu teléfono
                </button>
              </div>
            )}

            {!resultado && modoConsulta === 'telefono' && (
              <div className="card border-t-2 border-t-brand-500">
                <h3 className="font-bold text-brand-800 mb-1">Buscar por teléfono</h3>
                <p className="text-sm text-gray-500 mb-4">Te mostramos tus apartados más recientes en este centro con ese teléfono.</p>
                <form onSubmit={buscarPorTelefono} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Teléfono *</label>
                    <input className="input" inputMode="numeric" placeholder="Con el que apartaste" value={busquedaTel}
                      onChange={(e) => setBusquedaTel(soloDigitos(e.target.value, DIGITOS_TELEFONO))} />
                  </div>
                  {errorBusquedaTel && <p className="text-red-600 text-sm">{errorBusquedaTel}</p>}
                  <button type="submit" className="btn-primary w-full" disabled={buscandoTel}>{buscandoTel ? 'Buscando...' : 'Buscar'}</button>
                </form>
                {resultadosTel && (resultadosTel.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-4">No encontramos apartados con ese teléfono en este centro.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {resultadosTel.map((a) => (
                      <button key={a.folio} type="button"
                        className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => { setResultado(a); setTelefonoVerificado(busquedaTel); }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900">Folio #{a.folio}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_INFO[a.estado]?.color}`}>
                            {ESTADO_INFO[a.estado]?.icon} {ESTADO_INFO[a.estado]?.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{fmtFechaHora(a.solicitadoEn)}</span>
                          <span className="font-medium text-gray-600">{fmt(a.total)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                <button type="button" className="text-xs text-brand-700 hover:underline mt-3 block mx-auto"
                  onClick={() => { setModoConsulta('folio'); setErrorBusquedaTel(''); }}>
                  ← Ya tengo mi folio
                </button>
              </div>
            )}

            {resultado && (
              <div className="card border-t-2 border-t-brand-500">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-brand-800">Folio #{resultado.folio}</h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${ESTADO_INFO[resultado.estado]?.color}`}>
                    {ESTADO_INFO[resultado.estado]?.icon} {ESTADO_INFO[resultado.estado]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Solicitado el {fmtFechaHora(resultado.solicitadoEn)}</p>

                {resultado.estado === 'PENDIENTE' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 mb-4">
                    Todavía está en revisión — te avisamos en cuanto el centro lo confirme.
                  </div>
                )}
                {resultado.estado === 'ACTIVO' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 mb-4">
                    Pasa a recogerlo{resultado.expiraEn && <> — tienes hasta el <strong>{fmtFechaHora(resultado.expiraEn)}</strong></>}.
                  </div>
                )}
                {resultado.estado === 'COMPLETADO' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 mb-4">Ya se completó — gracias por tu compra.</div>
                )}
                {resultado.estado === 'CANCELADO' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800 mb-4">
                    Se canceló{resultado.canceladoEn && <> el {fmtFechaHora(resultado.canceladoEn)}</>}.
                    {resultado.motivoCancelacion && <> Motivo: {resultado.motivoCancelacion}</>}
                  </div>
                )}
                {resultado.estado === 'VENCIDO' && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 mb-4">
                    Se venció el plazo para recogerlo sin que se completara.
                  </div>
                )}

                <div className="space-y-1.5 mb-4">
                  {resultado.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between gap-3 text-sm">
                      <span>
                        {i.cantidad} x {i.articuloNombre}
                        {i.sucursalNombre && <span className="block text-[11px] text-gray-400">Recoger en: {i.sucursalNombre}</span>}
                      </span>
                      <span className="font-medium whitespace-nowrap">{fmt(i.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-2 border-t border-gray-100 font-bold text-gray-900">
                    <span>Total</span><span>{fmt(resultado.total)}</span>
                  </div>
                </div>

                {(resultado.estado === 'PENDIENTE' || resultado.estado === 'ACTIVO') && (
                  <div className="flex gap-2 mb-3">
                    <button type="button" className="btn-secondary flex-1" disabled={accionando} onClick={editarMiApartado}>Editar</button>
                    <button type="button" className="btn-danger flex-1" disabled={accionando} onClick={cancelarMiApartado}>Cancelar</button>
                  </div>
                )}
                <button type="button" className="btn-secondary w-full" onClick={reiniciarConsulta}>Consultar otro</button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4">
            {hayInfo && (
              <div className="mb-4">
                <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
                  onClick={() => setMostrarInfo((v) => !v)}>
                  ℹ️ Información y contacto
                  <span className={`text-xs transition-transform ${mostrarInfo ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {mostrarInfo && (
                  <div className="mt-2 bg-white border border-brand-100 rounded-lg px-4 py-3 text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {centro.direccion && (
                      <p className="flex items-start gap-2"><span>📍</span>
                        <span>{centro.direccion} · <a href={googleMapsUrl(centro.direccion)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">ver mapa</a></span>
                      </p>
                    )}
                    {centro.telefono && <p className="flex items-start gap-2"><span>📞</span><a href={`tel:${centro.telefono}`} className="hover:underline">{centro.telefono}</a></p>}
                    {centro.emailContacto && <p className="flex items-start gap-2"><span>✉️</span><a href={`mailto:${centro.emailContacto}`} className="hover:underline break-all">{centro.emailContacto}</a></p>}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-6 border-b border-gray-200 mb-6 text-sm">
              <button type="button"
                className={'pb-2 ' + (tab === 'productos' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
                onClick={() => setTab('productos')}>
                🛍️ Productos
              </button>
              <button type="button"
                className={'pb-2 ' + (tab === 'planes' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}
                onClick={() => setTab('planes')}>
                📋 Planes
              </button>
            </div>

            {tab === 'planes' ? (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Planes de membresía</h2>
                <p className="text-sm text-gray-500 mb-4">Conoce las opciones disponibles — apártalas con un anticipo del 20% pagado con tarjeta.</p>
                {exitoPlan && (
                  <div className="card mb-4 border border-emerald-200 bg-emerald-50">
                    <p className="font-semibold text-emerald-800">✅ Apartado registrado — folio #{exitoPlan.id}</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      Se cobró un anticipo de {fmt(exitoPlan.montoAnticipo)} con tarjeta (de {fmt(exitoPlan.precioPlan)} del plan).
                      El equipo de {centro.nombre} se pondrá en contacto contigo para completar tu inscripción.
                    </p>
                    <button type="button" className="text-xs text-emerald-700 underline mt-2" onClick={() => setExitoPlan(null)}>Cerrar</button>
                  </div>
                )}
                {planes.length === 0 ? (
                  <p className="text-sm text-gray-500">Aún no hay planes publicados.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planes.map((p) => (
                      <div key={p.id} className="card border-t-2 border-t-brand-300">
                        <p className="font-semibold text-gray-800">{p.nombre}</p>
                        <p className="text-brand-700 font-bold text-lg mt-1">{fmt(p.precio)}</p>
                        <p className="text-xs text-gray-500 mt-2">{describirPlan(p)}</p>
                        {p.limiteAlumnos != null && (
                          <p className={'text-xs mt-2 font-medium ' + (planLleno(p) ? 'text-red-600' : 'text-emerald-600')}>
                            {textoDisponibilidadPublica(p)}
                          </p>
                        )}
                        <button type="button" className="btn-primary text-xs w-full mt-3" disabled={planLleno(p)} onClick={() => abrirApartarPlan(p)}>
                          {planLleno(p) ? 'Cupo lleno' : 'Apartar este plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input className="input mb-3" placeholder="🔍 Buscar producto por nombre..." value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }} />
                {categorias.length > 0 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <button type="button"
                      className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (categoriaSel === null ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-700 border-brand-200')}
                      onClick={() => { setCategoriaSel(null); setPagina(0); }}>
                      Todas
                    </button>
                    {categorias.map((c) => (
                      <button type="button" key={c}
                        className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (categoriaSel === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-700 border-brand-200')}
                        onClick={() => { setCategoriaSel(c); setPagina(0); }}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {productosPagina.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-12">
                    {busqueda.trim() ? `No encontramos productos con "${busqueda.trim()}".` : 'Todavía no hay productos disponibles para apartar.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {productosPagina.map((p) => {
                      const fotos = fotosDe(p);
                      const indice = Math.min(imagenActiva[p.id] || 0, Math.max(fotos.length - 1, 0));
                      const conDescuento = Number(p.descuentoPorcentaje) > 0;
                      return (
                        <div key={p.id} className="card p-3 flex flex-col border-t-2 border-t-brand-300">
                          <button type="button" className="w-full aspect-square bg-gray-100 rounded-lg mb-1 overflow-hidden flex items-center justify-center cursor-zoom-in"
                            onClick={() => setModalDetalle(p)}>
                            {fotos.length > 0 ? <img src={fotos[indice]} alt={p.nombre} className="w-full h-full object-contain" /> : <span className="text-3xl">🛍️</span>}
                          </button>
                          {fotos.length > 1 && (
                            <div className="flex gap-1 justify-center mb-1">
                              {fotos.map((foto, i) => (
                                <button type="button" key={foto + i} aria-label={`Foto ${i + 1}`}
                                  onClick={() => setImagenActiva((prev) => ({ ...prev, [p.id]: i }))}
                                  className={'w-2 h-2 rounded-full ' + (i === indice ? 'bg-brand-600' : 'bg-gray-300')} />
                              ))}
                            </div>
                          )}
                          <button type="button" className="font-medium text-sm text-gray-900 line-clamp-2 text-left hover:text-brand-700" onClick={() => setModalDetalle(p)}>
                            {p.nombre}
                          </button>
                          <p className={`text-xs mt-0.5 ${p.stockTotal > 0 ? 'text-gray-400' : 'text-red-500 font-medium'}`}>
                            {p.stockTotal > 0 ? `${p.stockTotal} pieza${p.stockTotal === 1 ? '' : 's'}` : 'Sin stock disponible'}
                          </p>
                          {conDescuento ? (
                            <div className="mt-1">
                              <span className="text-xs text-gray-400 line-through mr-1">{fmt(p.precioVenta)}</span>
                              <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">-{Number(p.descuentoPorcentaje)}%</span>
                              <p className="font-bold text-brand-700">{fmt(p.precioConDescuento)}</p>
                            </div>
                          ) : (
                            <p className="font-bold text-brand-700 mt-1">{fmt(p.precioConDescuento)}</p>
                          )}
                          <button type="button" className="btn-primary text-xs mt-auto pt-1.5 pb-1.5" disabled={p.stockTotal === 0} onClick={() => abrirSeleccionSucursal(p)}>
                            + Apartar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPaginas > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button type="button" className="btn-secondary py-1 px-3 text-xs disabled:opacity-40" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>‹</button>
                    <span className="text-xs text-brand-700 font-medium self-center">Página {paginaActual + 1} de {totalPaginas}</span>
                    <button type="button" className="btn-secondary py-1 px-3 text-xs disabled:opacity-40" disabled={paginaActual + 1 >= totalPaginas} onClick={() => setPagina(paginaActual + 1)}>›</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-gray-400">
        Copyright © {new Date().getFullYear()} {centro.nombre}. Todos los derechos reservados. Hecho con Nexora Systems.
      </footer>

      {modalDetalle && (() => {
        const fotos = fotosDe(modalDetalle);
        const indice = Math.min(imagenActiva[modalDetalle.id] || 0, Math.max(fotos.length - 1, 0));
        const irA = (i) => setImagenActiva((prev) => ({ ...prev, [modalDetalle.id]: (i + fotos.length) % fotos.length }));
        const conDescuento = Number(modalDetalle.descuentoPorcentaje) > 0;
        return (
          <Modal title={modalDetalle.nombre} onClose={() => setModalDetalle(null)} wide>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {fotos.length > 0 ? <img src={fotos[indice]} alt={modalDetalle.nombre} className="w-full h-full object-contain" /> : <span className="text-5xl">🛍️</span>}
                  {fotos.length > 1 && (
                    <>
                      <button type="button" aria-label="Foto anterior" onClick={() => irA(indice - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl leading-none flex items-center justify-center transition-colors">‹</button>
                      <button type="button" aria-label="Foto siguiente" onClick={() => irA(indice + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl leading-none flex items-center justify-center transition-colors">›</button>
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">{indice + 1} / {fotos.length}</span>
                    </>
                  )}
                </div>
                {fotos.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {fotos.map((foto, i) => (
                      <button type="button" key={foto + i} onClick={() => irA(i)}
                        className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === indice ? 'border-brand-500' : 'border-transparent'}`}>
                        <img src={foto} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                {modalDetalle.categoriaNombre && <p className="text-xs text-gray-400 mb-1">{modalDetalle.categoriaNombre}</p>}
                {conDescuento ? (
                  <div className="mb-2">
                    <span className="text-sm text-gray-400 line-through mr-2">{fmt(modalDetalle.precioVenta)}</span>
                    <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded mr-2">-{Number(modalDetalle.descuentoPorcentaje)}%</span>
                    <p className="text-2xl font-bold text-brand-700">{fmt(modalDetalle.precioConDescuento)}</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-brand-700 mb-2">{fmt(modalDetalle.precioConDescuento)}</p>
                )}
                <p className={`text-sm mb-4 ${modalDetalle.stockTotal > 0 ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                  {modalDetalle.stockTotal > 0
                    ? `${modalDetalle.stockTotal} pieza${modalDetalle.stockTotal === 1 ? '' : 's'} disponible${modalDetalle.stockTotal === 1 ? '' : 's'}`
                    : 'Sin stock disponible'}
                </p>
                <button type="button" className="btn-primary w-full mt-auto" disabled={modalDetalle.stockTotal === 0}
                  onClick={() => { const p = modalDetalle; setModalDetalle(null); abrirSeleccionSucursal(p); }}>
                  + Apartar
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {modalSucursal && (
        <Modal title={`¿En qué sucursal quieres recoger "${modalSucursal.producto.nombre}"?`} onClose={() => setModalSucursal(null)}>
          <p className="text-xs text-gray-500 mb-3">Elige una sucursal para continuar — solo se muestran las que tienen existencia.</p>
          <div className="space-y-2 mb-4">
            {modalSucursal.producto.sucursales.filter((s) => s.stock > 0).map((s) => (
              <div key={s.sucursalId} role="radio" aria-checked={modalSucursal.elegidaId === s.sucursalId}
                onClick={() => setModalSucursal((prev) => ({ ...prev, elegidaId: s.sucursalId }))}
                className={'flex items-start gap-2 p-2 rounded-lg border cursor-pointer ' +
                  (modalSucursal.elegidaId === s.sucursalId ? 'border-brand-500 bg-brand-50/50' : 'border-gray-200 hover:bg-gray-50')}>
                <input type="radio" readOnly checked={modalSucursal.elegidaId === s.sucursalId} className="mt-1 pointer-events-none" />
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{s.sucursalNombre}</p>
                  {s.sucursalDireccion && (
                    <p className="text-xs text-gray-500">
                      {s.sucursalDireccion}{' '}
                      <a href={googleMapsUrl(s.sucursalDireccion)} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} className="text-brand-600 hover:underline">📍 ver mapa</a>
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
          <form onSubmit={confirmarApartadoPlan} className="space-y-3" noValidate>
            <p className="text-sm text-gray-600">
              Para apartar este plan se cobra un anticipo del 20%:{' '}
              <strong>{fmt(Number(modalPlan.precio) * PORCENTAJE_ANTICIPO_PLAN)}</strong> de {fmt(modalPlan.precio)}.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
              <input className="input" value={planCliente.nombre} onChange={(e) => setPlanCliente((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono *</label>
              <input className="input" inputMode="numeric" placeholder="10 dígitos" value={planCliente.telefono}
                onChange={(e) => setPlanCliente((p) => ({ ...p, telefono: soloDigitos(e.target.value, DIGITOS_TELEFONO) }))} />
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
            <p className="text-[11px] text-gray-400 -mt-2">Modo de prueba: todavía no está conectado a ningún banco, es solo para mostrar el flujo.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número de tarjeta</label>
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
              {enviandoPlan ? 'Procesando pago...' : `Pagar ${fmt(Number(modalPlan.precio) * PORCENTAJE_ANTICIPO_PLAN)} y apartar`}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
