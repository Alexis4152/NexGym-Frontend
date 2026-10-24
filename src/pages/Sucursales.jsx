import { useEffect, useState } from 'react';
import * as sucursalesApi from '../api/sucursales';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import DomicilioForm, { domicilioDesde, domicilioVacio, validarDomicilio, erroresDomicilioDelServidor } from '../components/DomicilioForm.jsx';

const emptySucursalForm = () => ({ nombre: '', domicilio: domicilioVacio(), notas: '', direccionAnterior: '' });

export default function Sucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [modalSucursal, setModalSucursal] = useState(null);
  const [sucursalForm, setSucursalForm] = useState(emptySucursalForm);
  const [domicilioErrors, setDomicilioErrors] = useState({});
  const { notify, confirmDialog } = useNotify();
  // isAdmin aqui significa Dueno o SUPER_ADMIN (ver AuthContext) -- un Admin/encargado
  // de sucursal (nivel ADMIN) solo puede VER la(s) suya(s), nunca crear/editar/desactivar.
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadSucursales();
  }, []);

  function loadSucursales() {
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
  }

  function openCreateSucursal() {
    setSucursalForm(emptySucursalForm());
    setDomicilioErrors({});
    setModalSucursal({ editing: null });
  }

  function openEditSucursal(s) {
    setSucursalForm({
      nombre: s.nombre,
      domicilio: domicilioDesde(s.domicilio),
      notas: s.notas || '',
      // Sucursales anteriores al formulario estructurado: se muestra el texto viejo como referencia.
      direccionAnterior: !s.domicilio && s.direccion ? s.direccion : '',
    });
    setDomicilioErrors({});
    setModalSucursal({ editing: s.id });
  }

  async function handleSubmitSucursal(e) {
    e.preventDefault();
    if (!sucursalForm.nombre.trim()) {
      notify('El nombre de la sucursal es obligatorio', 'error');
      return;
    }
    const errs = validarDomicilio(sucursalForm.domicilio);
    setDomicilioErrors(errs);
    if (Object.keys(errs).length) {
      notify('Completa el domicilio de la sucursal', 'error');
      return;
    }
    const payload = { nombre: sucursalForm.nombre, domicilio: sucursalForm.domicilio, notas: sucursalForm.notas };
    try {
      if (modalSucursal.editing) {
        await sucursalesApi.updateSucursal(modalSucursal.editing, payload);
        notify('Sucursal actualizada', 'success');
      } else {
        await sucursalesApi.createSucursal(payload);
        notify('Sucursal creada', 'success');
      }
      setModalSucursal(null);
      loadSucursales();
    } catch (err) {
      const errsServidor = erroresDomicilioDelServidor(err.response?.data?.data);
      setDomicilioErrors(errsServidor);
      notify(Object.values(errsServidor)[0] || err.response?.data?.message || 'No se pudo guardar la sucursal', 'error');
    }
  }

  async function handleDeactivateSucursal(s) {
    const ok = await confirmDialog(`Desactivar "${s.nombre}"?`, { danger: true });
    if (!ok) return;
    await sucursalesApi.deactivateSucursal(s.id);
    notify('Sucursal desactivada', 'success');
    loadSucursales();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Sucursales</h1>
        {isAdmin && <button className="btn-primary" onClick={openCreateSucursal}>+ Sucursal</button>}
      </div>
      {!isAdmin && (
        <p className="text-sm text-gray-500 mb-4">
          Solo puedes ver la(s) sucursal(es) que tienes asignada(s). Para crear, editar o
          desactivar una sucursal, pide al dueño del centro que lo haga.
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Nombre</th>
              <th>Direccion</th>
              <th>Notas</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sucursales.map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-800">{s.nombre}</td>
                <td className="text-gray-600">{s.direccion || '-'}</td>
                <td className="text-gray-500">{s.notas || '-'}</td>
                {isAdmin && (
                  <td className="text-right space-x-2">
                    <button className="text-brand-600 hover:underline" onClick={() => openEditSucursal(s)}>Editar</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeactivateSucursal(s)}>Desactivar</button>
                  </td>
                )}
              </tr>
            ))}
            {sucursales.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="py-6 text-center text-gray-400">
                  Aun no hay sucursales registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalSucursal && (
        <Modal title={modalSucursal.editing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={() => setModalSucursal(null)}>
          <form onSubmit={handleSubmitSucursal} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input" placeholder="Ej. Sucursal Norte" value={sucursalForm.nombre} onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Domicilio</h3>
              <p className="text-xs text-gray-400 mb-2">Se muestra en la tienda en línea para que el cliente sepa dónde recoger su apartado.</p>
              {sucursalForm.direccionAnterior && (
                <p className="text-xs bg-amber-50 text-amber-800 rounded px-2 py-1 mb-2">
                  Dirección capturada anteriormente: {sucursalForm.direccionAnterior}
                </p>
              )}
              <DomicilioForm value={sucursalForm.domicilio} errors={domicilioErrors}
                onChange={(d) => setSucursalForm((f) => ({ ...f, domicilio: d }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea className="input" rows={2} value={sucursalForm.notas} onChange={(e) => setSucursalForm({ ...sucursalForm, notas: e.target.value })} />
            </div>
            <button className="btn-primary w-full mt-2">{modalSucursal.editing ? 'Guardar cambios' : 'Crear sucursal'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
