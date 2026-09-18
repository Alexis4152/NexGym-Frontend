import { useEffect, useRef, useState } from 'react';
import * as inventarioApi from '../api/inventario';
import * as ventasApi from '../api/ventas';
import * as cortesCajaApi from '../api/cortesCaja';
import { useNotify } from '../context/NotifyContext.jsx';
import { printVentaTicket } from '../utils/printer';

const SCAN_GAP_MS = 50;
const MIN_CODE_LENGTH = 3;

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'OTRO', label: 'Otro' },
];

const TIPOS_TICKET = [
  { value: 'NINGUNO', label: 'Sin ticket' },
  { value: 'FISICO', label: '🖨️ Fisico' },
  { value: 'DIGITAL', label: '📧 Digital' },
  { value: 'AMBOS', label: '🖨️📧 Ambos' },
];

function lineGross(item) {
  return item.precioUnitario * item.cantidad;
}
function lineDescuento(item) {
  const d = Number(item.descuento || 0);
  return Math.min(Math.max(d, 0), lineGross(item));
}
function lineSubtotal(item) {
  return lineGross(item) - lineDescuento(item);
}

export default function VentaPos() {
  const [corteAbierto, setCorteAbierto] = useState(null);
  const [loadingCorte, setLoadingCorte] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [highlighted, setHighlighted] = useState(0);
  const [cart, setCart] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [tipoTicket, setTipoTicket] = useState('NINGUNO');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [printing, setPrinting] = useState(false);
  const searchInputRef = useRef(null);
  const scanBufferRef = useRef('');
  const scanLastTimeRef = useRef(0);
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    cargarCorte();
  }, []);

  function cargarCorte() {
    setLoadingCorte(true);
    cortesCajaApi.getCorteAbierto()
      .then(({ data }) => setCorteAbierto(data.data))
      .finally(() => setLoadingCorte(false));
  }

  // Busqueda por texto con debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      inventarioApi.listArticulos(query, 0, 8).then(({ data }) => {
        setResults(data.data.content.filter((a) => a.vendible && a.activo));
        setHighlighted(0);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Deteccion de escaneo: un lector de codigo de barras "escribe" muy rapido y termina con Enter
  useEffect(() => {
    function onKeyDown(e) {
      if (success || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement === searchInputRef.current) return;

      const now = Date.now();
      if (e.key === 'Enter') {
        const gap = now - scanLastTimeRef.current;
        const buffer = scanBufferRef.current;
        scanBufferRef.current = '';
        if (buffer.length >= MIN_CODE_LENGTH && gap < SCAN_GAP_MS) {
          buscarPorCodigo(buffer);
        }
        return;
      }
      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        scanLastTimeRef.current = now;
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

  async function buscarPorCodigo(codigo) {
    try {
      const { data } = await inventarioApi.buscarArticuloPorCodigoBarras(codigo);
      if (data.data) {
        addToCart(data.data);
      } else {
        notify(`Codigo "${codigo}" no encontrado`, 'error');
      }
    } catch {
      notify(`Codigo "${codigo}" no encontrado`, 'error');
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setResults([]);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const texto = query.trim();
      if (texto && !texto.includes(' ')) {
        inventarioApi.buscarArticuloPorCodigoBarras(texto).then(({ data }) => {
          if (data.data) {
            addToCart(data.data);
          } else if (results[highlighted]) {
            addToCart(results[highlighted]);
          }
        }).catch(() => {
          if (results[highlighted]) addToCart(results[highlighted]);
        });
      } else if (results[highlighted]) {
        addToCart(results[highlighted]);
      }
    }
  }

  function addToCart(articulo) {
    if (articulo.stock <= 0) {
      notify(`"${articulo.nombre}" no tiene stock disponible`, 'error');
      return;
    }
    setCart((prev) => {
      const existente = prev.find((i) => i.articuloId === articulo.id);
      if (existente) {
        if (existente.cantidad + 1 > articulo.stock) {
          notify(`Ya tienes el maximo disponible de "${articulo.nombre}" en el carrito`, 'error');
          return prev;
        }
        return prev.map((i) => (i.articuloId === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, {
        articuloId: articulo.id, nombre: articulo.nombre, precioUnitario: Number(articulo.precioVenta || 0),
        cantidad: 1, stock: articulo.stock, descuento: 0,
      }];
    });
    setQuery('');
    setResults([]);
    notify(`"${articulo.nombre}" agregado`, 'success');
    searchInputRef.current?.focus();
  }

  function updateCantidad(articuloId, nuevaCantidad) {
    setCart((prev) => prev.map((i) => {
      if (i.articuloId !== articuloId) return i;
      const cantidad = Math.max(1, Math.min(nuevaCantidad, i.stock));
      return { ...i, cantidad };
    }));
  }

  function updateDescuento(articuloId, valor) {
    setCart((prev) => prev.map((i) => (i.articuloId === articuloId ? { ...i, descuento: valor } : i)));
  }

  function removeItem(articuloId) {
    setCart((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  async function clearCart() {
    if (cart.length === 0) return;
    const ok = await confirmDialog('Vaciar el carrito?', { danger: true });
    if (!ok) return;
    setCart([]);
  }

  const subtotal = cart.reduce((sum, i) => sum + lineSubtotal(i), 0);
  const montoRecibidoNum = Number(montoRecibido || 0);
  const cambio = montoRecibidoNum - subtotal;
  const cashAmountMissing = metodoPago === 'EFECTIVO' && (montoRecibido === '' || montoRecibidoNum < subtotal);
  const digitalEmailMissing = (tipoTicket === 'DIGITAL' || tipoTicket === 'AMBOS') && !clienteEmail.trim();

  async function handleCheckout() {
    if (cart.length === 0) {
      notify('Agrega al menos un articulo', 'error');
      return;
    }
    if (!corteAbierto) {
      notify('Debes abrir un corte de caja antes de vender', 'error');
      return;
    }
    if (cashAmountMissing) {
      notify('Ingresa el monto recibido en efectivo', 'error');
      return;
    }
    if (digitalEmailMissing) {
      notify('El correo del cliente es obligatorio para el ticket digital', 'error');
      return;
    }
    const ok = await confirmDialog(`Registrar venta por $${subtotal.toFixed(2)}?`);
    if (!ok) return;

    setLoading(true);
    try {
      const payload = {
        clienteNombre: clienteNombre || null,
        clienteEmail: clienteEmail || null,
        metodoPago,
        tipoTicket,
        montoRecibido: metodoPago === 'EFECTIVO' ? montoRecibidoNum : null,
        items: cart.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad, descuento: lineDescuento(i) })),
      };
      const { data } = await ventasApi.createVenta(payload);
      const venta = data.data;
      notify('Venta registrada', 'success');

      if (venta.tipoTicket === 'FISICO' || venta.tipoTicket === 'AMBOS') {
        setPrinting(true);
        try {
          await printVentaTicket(venta.id);
        } catch (err) {
          notify(err.message || 'No se pudo imprimir el ticket', 'error');
        } finally {
          setPrinting(false);
        }
      }

      setSuccess(venta);
      setCart([]);
      setMontoRecibido('');
      setClienteNombre('');
      setClienteEmail('');
      cargarCorte();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la venta', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReimprimir() {
    if (!success) return;
    setPrinting(true);
    try {
      await printVentaTicket(success.id);
      notify('Ticket enviado a la impresora', 'success');
    } catch (err) {
      notify(err.message || 'No se pudo imprimir el ticket', 'error');
    } finally {
      setPrinting(false);
    }
  }

  function nuevaVenta() {
    setSuccess(null);
    setTipoTicket('NINGUNO');
    searchInputRef.current?.focus();
  }

  if (loadingCorte) {
    return <p className="text-sm text-gray-400">Cargando...</p>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto card text-center">
        <p className="text-4xl mb-2">✅</p>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Venta registrada</h2>
        <p className="text-sm text-gray-500 mb-4">Ticket #{success.id}</p>
        <div className="text-left text-sm space-y-1 mb-4 border-t border-b border-gray-100 py-3">
          <div className="flex justify-between"><span>Total</span><strong>${Number(success.total).toFixed(2)}</strong></div>
          {success.montoRecibido != null && (
            <>
              <div className="flex justify-between text-gray-500"><span>Recibido</span><span>${Number(success.montoRecibido).toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Cambio</span><span>${Number(success.cambio).toFixed(2)}</span></div>
            </>
          )}
          {success.clienteEmail && (success.tipoTicket === 'DIGITAL' || success.tipoTicket === 'AMBOS') && (
            <p className="text-emerald-600 text-xs mt-2">📧 Ticket enviado a {success.clienteEmail}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" disabled={printing} onClick={handleReimprimir}>
            {printing ? 'Imprimiendo...' : '🖨️ Reimprimir'}
          </button>
          <button className="btn-primary flex-1" onClick={nuevaVenta}>Nueva venta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {!corteAbierto && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
            ⚠️ No hay corte de caja abierto. Ve a la pestana "Cortes de caja" para abrir uno antes de vender.
          </div>
        )}

        <div className="relative">
          <input
            ref={searchInputRef}
            className="input"
            placeholder="Buscar por nombre o escanear codigo de barras..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.map((r, idx) => (
                <button
                  type="button"
                  key={r.id}
                  className={'flex justify-between w-full text-left px-3 py-2 text-sm ' + (idx === highlighted ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50')}
                  onClick={() => addToCart(r)}
                >
                  <span>{r.nombre}</span>
                  <span className="text-gray-400">${Number(r.precioVenta || 0).toFixed(2)} · stock {r.stock}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Carrito</h3>
            {cart.length > 0 && (
              <button className="text-red-600 text-xs hover:underline" onClick={clearCart}>Vaciar carrito</button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.articuloId} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{item.nombre}</td>
                  <td className="text-gray-600">${item.precioUnitario.toFixed(2)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button type="button" className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200" onClick={() => updateCantidad(item.articuloId, item.cantidad - 1)}>-</button>
                      <input
                        className="w-12 text-center border border-gray-200 rounded text-sm"
                        value={item.cantidad}
                        onChange={(e) => updateCantidad(item.articuloId, Number(e.target.value) || 1)}
                      />
                      <button type="button" className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200" onClick={() => updateCantidad(item.articuloId, item.cantidad + 1)}>+</button>
                    </div>
                    <p className="text-xs text-gray-400">disp. {item.stock}</p>
                  </td>
                  <td>
                    <input
                      type="number" min="0" step="0.01"
                      className="w-20 border border-gray-200 rounded text-sm px-1 py-0.5"
                      value={item.descuento}
                      onChange={(e) => updateDescuento(item.articuloId, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="font-medium text-gray-800">${lineSubtotal(item).toFixed(2)}</td>
                  <td>
                    <button type="button" className="text-red-600" onClick={() => removeItem(item.articuloId)}>✕</button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">Busca o escanea un producto para agregarlo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card h-fit sticky top-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Resumen</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-bold text-gray-800"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Metodo de pago</label>
          <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {metodoPago === 'EFECTIVO' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto recibido</label>
            <input type="number" step="0.01" className="input" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} />
            {montoRecibido !== '' && (
              <p className={'text-xs mt-1 ' + (cambio < 0 ? 'text-red-600' : 'text-emerald-600')}>
                {cambio < 0 ? `Falta por cobrar: $${Math.abs(cambio).toFixed(2)}` : `Cambio a entregar: $${cambio.toFixed(2)}`}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cliente (opcional)</label>
          <input className="input mb-2" placeholder="Nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          <input className="input" placeholder="Correo" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ticket</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_TICKET.map((t) => (
              <button
                key={t.value}
                type="button"
                className={'py-2 rounded-lg text-xs font-semibold border ' + (tipoTicket === t.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
                onClick={() => setTipoTicket(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full" disabled={loading || !corteAbierto} onClick={handleCheckout}>
          {loading ? 'Registrando...' : 'Cobrar'}
        </button>
      </div>
    </div>
  );
}
