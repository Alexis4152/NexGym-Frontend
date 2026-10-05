import { useEffect, useState } from 'react';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import { applyBrandColor } from '../utils/theme';

export default function CentroInfo() {
  const { user, actingCentroId } = useAuth();
  const [form, setForm] = useState(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
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

  async function handleSubirLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const { data } = await centrosApi.uploadLogoCentro(centroId, file);
      setForm(data.data);
      notify('Logo actualizado', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo subir el logo', 'error');
    } finally {
      setSubiendoLogo(false);
      e.target.value = '';
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="w-16 h-16 rounded-lg object-contain border border-gray-200 bg-white" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">🏢</div>
            )}
            <label className="btn-secondary text-sm cursor-pointer">
              {subiendoLogo ? 'Subiendo...' : 'Cambiar logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSubirLogo} disabled={subiendoLogo} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1">Aparece en el catalogo publico y en el folleto/QR de apartados.</p>
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

        <hr className="border-gray-100" />
        <h2 className="font-semibold text-gray-800">Notificaciones</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.notificacionesMembresiaActivo}
            onChange={(e) => setForm({ ...form, notificacionesMembresiaActivo: e.target.checked })} />
          Avisos de membresias (vencimientos, pagos, renovaciones)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.notificacionesClaseActivo}
            onChange={(e) => setForm({ ...form, notificacionesClaseActivo: e.target.checked })} />
          Avisos de clases (reservas, recordatorios, cambios y cancelaciones)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.notificacionesEmailActivo}
            onChange={(e) => setForm({ ...form, notificacionesEmailActivo: e.target.checked })} />
          Enviar por correo electronico
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.notificacionesInternoActivo}
            onChange={(e) => setForm({ ...form, notificacionesInternoActivo: e.target.checked })} />
          Mostrar en la campana interna
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avisar vencimiento (dias antes)</label>
            <input className="input" value={form.notificacionesDiasAntesVencimiento || ''}
              onChange={(e) => setForm({ ...form, notificacionesDiasAntesVencimiento: e.target.value })}
              placeholder="7,3,1,0" />
            <p className="text-xs text-gray-400 mt-1">Lista separada por comas. 0 = el mismo dia.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recordatorio de clase (horas antes)</label>
            <input type="number" min="0" className="input" value={form.notificacionesHorasAntesClase ?? ''}
              onChange={(e) => setForm({ ...form, notificacionesHorasAntesClase: e.target.value === '' ? null : Number(e.target.value) })} />
            <p className="text-xs text-gray-400 mt-1">Vacio o 0 desactiva el recordatorio.</p>
          </div>
        </div>

        <hr className="border-gray-100" />
        <h2 className="font-semibold text-gray-800">Caja</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cierre automatico de cortes (hora)</label>
          <input type="time" className="input w-40" value={form.horaCierreAutomaticoCorte ? form.horaCierreAutomaticoCorte.slice(0, 5) : ''}
            onChange={(e) => setForm({ ...form, horaCierreAutomaticoCorte: e.target.value || null })} />
          <p className="text-xs text-gray-400 mt-1">
            Si al llegar esta hora alguien dejo un corte de caja abierto, el sistema lo cierra solo (sin gastos, marcado como "Sistema").
            Vacio = desactivado.
          </p>
        </div>

        <button className="btn-primary w-full mt-2">Guardar cambios</button>
      </form>
    </div>
  );
}
