import { useEffect, useState } from 'react';
import * as disciplinasApi from '../api/disciplinas';
import * as lugaresApi from '../api/lugares';
import * as sucursalesApi from '../api/sucursales';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { confirmarGuardado } from '../utils/confirmaciones.js';

const emptyLugarForm = { sucursalId: '', nombre: '', direccion: '', notas: '', capacidadMaxima: '', disciplinaIds: [] };

// Misma comparacion que LugarService#normalizar: sin mayusculas, acentos ni espacios de mas.
const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export default function Instalaciones() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [modalLugar, setModalLugar] = useState(null);
  const [lugarForm, setLugarForm] = useState(emptyLugarForm);
  const [lugarErrors, setLugarErrors] = useState({});
  const { notify, confirmDialog } = useNotify();
  const { hasPermiso } = useAuth();
  const puedeAdministrar = hasPermiso('INSTALACIONES_ADMINISTRAR');

  const unicaSucursal = sucursales.length === 1 ? sucursales[0] : null;

  useEffect(() => {
    loadLugares();
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  function loadLugares() {
    lugaresApi.listLugaresActivos().then(({ data }) => setLugares(data.data));
  }

  function openCreateLugar() {
    setLugarForm({ ...emptyLugarForm, sucursalId: unicaSucursal ? unicaSucursal.id : '' });
    setLugarErrors({});
    setModalLugar({ editing: null });
  }

  function openEditLugar(l) {
    setLugarForm({
      sucursalId: l.sucursalId, nombre: l.nombre, direccion: l.direccion || '', notas: l.notas || '',
      capacidadMaxima: l.capacidadMaxima ?? '', disciplinaIds: l.disciplinaIds ? [...l.disciplinaIds] : [],
    });
    setLugarErrors({});
    setModalLugar({ editing: l.id });
  }

  function toggleDisciplinaLugar(id) {
    setLugarForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id) ? f.disciplinaIds.filter((x) => x !== id) : [...f.disciplinaIds, id],
    }));
  }

  async function handleSubmitLugar(e) {
    e.preventDefault();
    if (!lugarForm.nombre.trim()) {
      notify('El nombre del lugar es obligatorio', 'error');
      return;
    }
    if (!lugarForm.sucursalId) {
      notify('Selecciona a que sucursal pertenece', 'error');
      return;
    }
    // Aviso inmediato con la lista ya cargada; el backend vuelve a validar (y es el que manda).
    const mismaSucursal = lugares.filter((l) => String(l.sucursalId) === String(lugarForm.sucursalId) && l.id !== modalLugar.editing);
    const nombreRepetido = mismaSucursal.find((l) => normalizar(l.nombre) === normalizar(lugarForm.nombre));
    const direccionRepetida = normalizar(lugarForm.direccion)
      && mismaSucursal.find((l) => normalizar(l.direccion) === normalizar(lugarForm.direccion));
    const errs = {};
    if (nombreRepetido) errs.nombre = `Ya existe la instalación "${nombreRepetido.nombre}" en esta sucursal. Usa un nombre diferente.`;
    if (direccionRepetida) errs.direccion = `La instalación "${direccionRepetida.nombre}" ya tiene esa dirección. Usa una dirección diferente.`;
    setLugarErrors(errs);
    if (Object.keys(errs).length) {
      notify(Object.values(errs)[0], 'error');
      return;
    }
    const payload = { ...lugarForm, capacidadMaxima: lugarForm.capacidadMaxima ? Number(lugarForm.capacidadMaxima) : null };
    if (!(await confirmarGuardado(confirmDialog, { editando: !!modalLugar.editing, que: 'la instalación', nombre: lugarForm.nombre }))) return;
    try {
      if (modalLugar.editing) {
        await lugaresApi.updateLugar(modalLugar.editing, payload);
        notify('Instalacion actualizada', 'success');
      } else {
        await lugaresApi.createLugar(payload);
        notify('Instalacion creada', 'success');
      }
      setModalLugar(null);
      loadLugares();
    } catch (err) {
      const data = err.response?.data?.data;
      const errsServidor = data && typeof data === 'object' ? data : {};
      setLugarErrors(errsServidor);
      notify(Object.values(errsServidor)[0] || err.response?.data?.message || 'No se pudo guardar la instalacion', 'error');
    }
  }

  async function handleDeactivateLugar(l) {
    const ok = await confirmDialog(`Desactivar "${l.nombre}"?`, { danger: true });
    if (!ok) return;
    await lugaresApi.deactivateLugar(l.id);
    notify('Instalacion desactivada', 'success');
    loadLugares();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Instalaciones</h1>
        {puedeAdministrar && <button className="btn-primary" onClick={openCreateLugar}>+ Instalacion</button>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Nombre</th>
              {sucursales.length > 1 && <th>Sucursal</th>}
              <th>Direccion</th>
              <th>Capacidad</th>
              <th>Disciplinas</th>
              {puedeAdministrar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lugares.map((l) => (
              <tr key={l.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{l.nombre}</td>
                {sucursales.length > 1 && <td className="text-gray-600">{l.sucursalNombre}</td>}
                <td className="text-gray-600">{l.direccion || '-'}</td>
                <td className="text-gray-500">{l.capacidadMaxima ?? 'Sin limite'}</td>
                <td className="text-gray-500">{l.disciplinaNombres?.length ? l.disciplinaNombres.join(', ') : 'Todas'}</td>
                {puedeAdministrar && (
                  <td className="text-right space-x-2">
                    <button className="text-brand-600 hover:underline" onClick={() => openEditLugar(l)}>Editar</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivateLugar(l)}>Desactivar</button>
                  </td>
                )}
              </tr>
            ))}
            {lugares.length === 0 && (
              <tr>
                <td colSpan={(sucursales.length > 1 ? 5 : 4) + (puedeAdministrar ? 1 : 0)} className="py-6 text-center text-gray-400">
                  Aun no hay instalaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalLugar && (
        <Modal title={modalLugar.editing ? 'Editar instalacion' : 'Nueva instalacion'} onClose={() => setModalLugar(null)}>
          <form onSubmit={handleSubmitLugar} className="space-y-3">
            {sucursales.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select className="input" value={lugarForm.sucursalId} onChange={(e) => setLugarForm({ ...lugarForm, sucursalId: e.target.value })}>
                  <option value="">Selecciona una sucursal</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" placeholder="Ej. Alberca A" value={lugarForm.nombre} onChange={(e) => setLugarForm({ ...lugarForm, nombre: e.target.value })} />
              {lugarErrors.nombre && <p className="text-xs text-red-600 mt-1">{lugarErrors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
              <input className="input" placeholder="Ej. Av. Reforma 123, Piso 2" value={lugarForm.direccion} onChange={(e) => setLugarForm({ ...lugarForm, direccion: e.target.value })} />
              {lugarErrors.direccion && <p className="text-xs text-red-600 mt-1">{lugarErrors.direccion}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad maxima (opcional)</label>
              <input type="number" className="input" value={lugarForm.capacidadMaxima} onChange={(e) => setLugarForm({ ...lugarForm, capacidadMaxima: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas compatibles (vacio = todas)</label>
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <button type="button" key={d.id} onClick={() => toggleDisciplinaLugar(d.id)}
                    className={'px-3 py-1 rounded-full text-xs border ' + (lugarForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                    {d.icono} {d.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={lugarForm.notas} onChange={(e) => setLugarForm({ ...lugarForm, notas: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modalLugar.editing ? 'Guardar cambios' : 'Crear instalacion'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
