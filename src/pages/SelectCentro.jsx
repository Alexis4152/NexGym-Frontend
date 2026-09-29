import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';

export default function SelectCentro() {
  const [centros, setCentros] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre] = useState('');
  const { selectCentro, isSuperAdmin } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  function load() {
    // SUPER_ADMIN ve todos los centros de la plataforma; un Supervisor multi-centro
    // ve solo su centro "hogar" + los adicionales que se le hayan asignado.
    centrosApi.listCentrosDisponibles().then(({ data }) => setCentros(data.data));
  }

  function handleSelect(id) {
    selectCentro(id);
    navigate('/');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      const { data } = await centrosApi.createCentro({ nombre });
      notify('Centro creado', 'success');
      setShowCreate(false);
      setNombre('');
      load();
      selectCentro(data.data.id);
      navigate('/');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el centro', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Selecciona un centro deportivo</h1>
          {isSuperAdmin && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + Nuevo centro
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {centros.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className="card text-left hover:border-brand-400 transition-colors"
            >
              <p className="font-semibold text-gray-800">{c.nombre}</p>
              <p className="text-xs text-gray-500">{c.activo ? 'Activo' : 'Inactivo'}</p>
            </button>
          ))}
          {centros.length === 0 && <p className="text-sm text-gray-500">Aun no hay centros creados.</p>}
        </div>
      </div>

      {showCreate && (
        <Modal title="Nuevo centro deportivo" onClose={() => setShowCreate(false)}>
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
