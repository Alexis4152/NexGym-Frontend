import { useEffect, useState } from 'react';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

export default function Centros() {
  const [centros, setCentros] = useState([]);
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const { selectCentro } = useAuth();
  const { notify } = useNotify();

  useEffect(() => {
    load();
  }, []);

  function load() {
    centrosApi.listCentros().then(({ data }) => setCentros(data.data));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      await centrosApi.createCentro({ nombre });
      notify('Centro creado', 'success');
      setModal(false);
      setNombre('');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el centro', 'error');
    }
  }

  function actuarComo(id) {
    selectCentro(id);
    window.location.href = '/';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Centros deportivos</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo centro</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {centros.map((c) => (
          <div key={c.id} className="card">
            <h3 className="font-semibold text-gray-800">{c.nombre}</h3>
            <p className="text-xs text-gray-500 mb-3">{c.activo ? 'Activo' : 'Inactivo'} · {c.slugPublico}</p>
            <button className="btn-secondary text-xs" onClick={() => actuarComo(c.id)}>Actuar como este centro</button>
          </div>
        ))}
        {centros.length === 0 && <p className="text-sm text-gray-500">Aun no hay centros creados.</p>}
      </div>

      {modal && (
        <Modal title="Nuevo centro deportivo" onClose={() => setModal(false)}>
          <form onSubmit={handleCreate}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input className="input mb-4" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            <button className="btn-primary w-full">Crear</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
