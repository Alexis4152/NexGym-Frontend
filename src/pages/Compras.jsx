import { useEffect, useState } from 'react';
import * as proveedoresApi from '../api/proveedores';
import * as comprasApi from '../api/compras';
import * as inventarioApi from '../api/inventario';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const emptyItem = { articuloId: '', descripcion: '', cantidad: 1, costoUnitario: '' };

export default function Compras() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [modalCompra, setModalCompra] = useState(false);
  const [compraForm, setCompraForm] = useState({ proveedorId: '', fechaPlaneada: '', notas: '' });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const { notify } = useNotify();

  useEffect(() => {
    proveedoresApi.listProveedores(0, 100).then(({ data }) => setProveedores(data.data.content));
    loadCompras();
    inventarioApi.listArticulos('', 0, 200).then(({ data }) => setArticulos(data.data.content));
  }, []);

  function loadCompras() {
    comprasApi.listCompras(0, 50).then(({ data }) => setCompras(data.data.content));
  }

  function updateItem(i, patch) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }
  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCrearCompra(e) {
    e.preventDefault();
    if (!compraForm.proveedorId || items.some((it) => !it.descripcion || !it.costoUnitario)) {
      notify('Completa proveedor y todos los articulos', 'error');
      return;
    }
    try {
      await comprasApi.createCompra({
        ...compraForm,
        items: items.map((it) => ({ ...it, articuloId: it.articuloId || null, cantidad: Number(it.cantidad), costoUnitario: Number(it.costoUnitario) })),
      });
      notify('Compra registrada', 'success');
      setModalCompra(false);
      setCompraForm({ proveedorId: '', fechaPlaneada: '', notas: '' });
      setItems([{ ...emptyItem }]);
      loadCompras();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la compra', 'error');
    }
  }

  async function handleMarcarRealizada(id) {
    await comprasApi.marcarCompraRealizada(id);
    notify('Compra marcada como realizada: se actualizo inventario y caja', 'success');
    loadCompras();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Compras</h1>
        <button className="btn-primary" onClick={() => setModalCompra(true)}>+ Compra</button>
      </div>

      <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Proveedor</th>
                <th>Estado</th>
                <th>Fecha planeada</th>
                <th className="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{c.proveedorNombre}</td>
                  <td className="text-gray-600">{c.estado}</td>
                  <td className="text-gray-500">{c.fechaPlaneada || '-'}</td>
                  <td className="text-right font-medium">${Number(c.total).toFixed(2)}</td>
                  <td className="text-right">
                    {c.estado !== 'REALIZADA' && (
                      <button className="text-brand-600 hover:underline" onClick={() => handleMarcarRealizada(c.id)}>
                        Marcar realizada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {compras.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Sin compras registradas</td></tr>}
            </tbody>
          </table>
        </div>

      {modalCompra && (
        <Modal title="Nueva compra" onClose={() => setModalCompra(false)} wide>
          <form onSubmit={handleCrearCompra} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select className="input" value={compraForm.proveedorId} onChange={(e) => setCompraForm({ ...compraForm, proveedorId: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha planeada</label>
                <input type="date" className="input" value={compraForm.fechaPlaneada} onChange={(e) => setCompraForm({ ...compraForm, fechaPlaneada: e.target.value })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Articulos</label>
                <button type="button" className="text-xs text-brand-600 hover:underline" onClick={addItem}>+ Agregar linea</button>
              </div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <select className="input col-span-4" value={it.articuloId} onChange={(e) => {
                      const art = articulos.find((a) => String(a.id) === e.target.value);
                      updateItem(i, { articuloId: e.target.value, descripcion: art ? art.nombre : it.descripcion });
                    }}>
                      <option value="">(Nuevo articulo)</option>
                      {articulos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <input className="input col-span-4" placeholder="Descripcion" value={it.descripcion} onChange={(e) => updateItem(i, { descripcion: e.target.value })} />
                    <input className="input col-span-2" type="number" min="1" value={it.cantidad} onChange={(e) => updateItem(i, { cantidad: e.target.value })} />
                    <input className="input col-span-2" type="number" step="0.01" placeholder="Costo" value={it.costoUnitario} onChange={(e) => updateItem(i, { costoUnitario: e.target.value })} />
                    {items.length > 1 && (
                      <button type="button" className="col-span-12 text-xs text-red-600 text-left" onClick={() => removeItem(i)}>Quitar</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary w-full mt-2">Registrar compra</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
