import { useEffect, useState } from 'react';
import * as proveedoresApi from '../api/proveedores';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

const emptyProveedor = { nombre: '', contacto: '', telefono: '', email: '', notas: '' };

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [proveedorForm, setProveedorForm] = useState(emptyProveedor);
  const { notify } = useNotify();

  useEffect(() => {
    loadProveedores();
  }, []);

  function loadProveedores() {
    proveedoresApi.listProveedores(0, 100).then(({ data }) => setProveedores(data.data.content));
  }

  async function handleCrearProveedor(e) {
    e.preventDefault();
    await proveedoresApi.createProveedor(proveedorForm);
    notify('Proveedor creado', 'success');
    setModalProveedor(false);
    setProveedorForm(emptyProveedor);
    loadProveedores();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Proveedores</h1>
        <button className="btn-primary" onClick={() => setModalProveedor(true)}>+ Proveedor</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {proveedores.map((p) => (
          <div key={p.id} className="card">
            <h3 className="font-semibold text-gray-800">{p.nombre}</h3>
            <p className="text-xs text-gray-500">{p.contacto}</p>
            <p className="text-xs text-gray-500">{p.telefono || p.email}</p>
          </div>
        ))}
        {proveedores.length === 0 && <p className="text-sm text-gray-500">Aun no hay proveedores.</p>}
      </div>

      {modalProveedor && (
        <Modal title="Nuevo proveedor" onClose={() => setModalProveedor(false)}>
          <form onSubmit={handleCrearProveedor} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" value={proveedorForm.nombre} onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input className="input" value={proveedorForm.contacto} onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input className="input" value={proveedorForm.telefono} onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input className="input" value={proveedorForm.email} onChange={(e) => setProveedorForm({ ...proveedorForm, email: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary w-full mt-2">Crear proveedor</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
