import { useEffect, useState } from 'react';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import { applyBrandColor } from '../utils/theme';

export default function CentroInfo() {
  const { user, actingCentroId } = useAuth();
  const [form, setForm] = useState(null);
  const { notify } = useNotify();
  const centroId = user?.centroId || actingCentroId;

  useEffect(() => {
    if (centroId) centrosApi.getCentro(centroId).then(({ data }) => setForm(data.data));
  }, [centroId]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await centrosApi.updateCentro(centroId, form);
      setForm(data.data);
      applyBrandColor(data.data.colorPrimario);
      notify('Configuracion actualizada', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error');
    }
  }

  if (!form) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Configuracion del centro</h1>
      <form onSubmit={handleSubmit} className="card max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input className="input" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo de contacto</label>
            <input className="input" value={form.emailContacto || ''} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
          <input className="input" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color de marca</label>
          <input type="color" className="input h-10" value={form.colorPrimario || '#1c6690'} onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })} />
        </div>

        <hr className="border-gray-100" />
        <h2 className="font-semibold text-gray-800">Tienda publica</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.catalogoPublicoActivo} onChange={(e) => setForm({ ...form, catalogoPublicoActivo: e.target.checked })} />
          Habilitar catalogo publico compartible
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enlace publico (slug)</label>
          <input className="input" value={form.slugPublico || ''} onChange={(e) => setForm({ ...form, slugPublico: e.target.value })} placeholder="mi-gimnasio" />
          <p className="text-xs text-gray-400 mt-1">{window.location.origin}/tienda/{form.slugPublico || '...'}</p>
        </div>

        <hr className="border-gray-100" />
        <h2 className="font-semibold text-gray-800">Apartados en linea</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.apartadosActivo} onChange={(e) => setForm({ ...form, apartadosActivo: e.target.checked })} />
          Habilitar apartados desde la tienda publica
        </label>
        {form.apartadosActivo && (
          <p className="text-xs text-gray-400 -mt-2">{window.location.origin}/apartar/{form.slugPublico || '...'}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horas para recoger (por defecto)</label>
            <input type="number" min="1" className="input" value={form.horasApartadoDefault ?? 24}
              onChange={(e) => setForm({ ...form, horasApartadoDefault: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descuento maximo por monto ($, opcional)</label>
            <input type="number" step="0.01" className="input" value={form.montoMaximoDescuentoApartado ?? ''}
              onChange={(e) => setForm({ ...form, montoMaximoDescuentoApartado: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descuento maximo por % (opcional)</label>
            <input type="number" step="0.01" className="input" value={form.porcentajeMaximoDescuentoApartado ?? ''}
              onChange={(e) => setForm({ ...form, porcentajeMaximoDescuentoApartado: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          Si ambos quedan vacios, no se podran aplicar descuentos al confirmar un apartado.
        </p>

        <button className="btn-primary w-full mt-2">Guardar cambios</button>
      </form>
    </div>
  );
}
