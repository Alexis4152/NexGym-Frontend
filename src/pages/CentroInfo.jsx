import { useEffect, useState } from 'react';
import * as centrosApi from '../api/centros';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import { applyBrandColor } from '../utils/theme';
import { confirmarAccion, confirmarGuardado } from '../utils/confirmaciones.js';
import DomicilioForm, { domicilioDesde, validarDomicilio, erroresDomicilioDelServidor } from '../components/DomicilioForm.jsx';

// El backend manda `domicilio` null mientras no se capture; el formulario siempre trabaja con un objeto.
const conDomicilio = (c) => ({ ...c, domicilio: domicilioDesde(c.domicilio), direccionAnterior: !c.domicilio && c.direccion ? c.direccion : '' });

export default function CentroInfo() {
  const { user, actingCentroId } = useAuth();
  const [form, setForm] = useState(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [domicilioErrors, setDomicilioErrors] = useState({});
  const { notify, confirmDialog } = useNotify();
  const centroId = user?.centroId || actingCentroId;

  useEffect(() => {
    if (centroId) centrosApi.getCentro(centroId).then(({ data }) => setForm(conDomicilio(data.data)));
  }, [centroId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validarDomicilio(form.domicilio);
    setDomicilioErrors(errs);
    if (Object.keys(errs).length) {
      notify('El domicilio del centro es obligatorio: completa los campos marcados', 'error');
      document.getElementById('domicilio-centro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!(await confirmarGuardado(confirmDialog, { editando: true, que: 'la configuración del centro', nombre: form.nombre }))) return;
    try {
      const { data } = await centrosApi.updateCentro(centroId, form);
      setForm(conDomicilio(data.data));
      applyBrandColor(data.data.colorPrimario);
      notify('Configuracion actualizada', 'success');
    } catch (err) {
      const errsServidor = erroresDomicilioDelServidor(err.response?.data?.data);
      setDomicilioErrors(errsServidor);
      notify(Object.values(errsServidor)[0] || err.response?.data?.message || 'No se pudo guardar', 'error');
    }
  }

  async function handleSubirLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await confirmarAccion(confirmDialog, `¿Cambiar el logo del centro por "${file.name}"?`))) {
      e.target.value = '';
      return;
    }
    setSubiendoLogo(true);
    try {
      const { data } = await centrosApi.uploadLogoCentro(centroId, file);
      // Conserva lo que el usuario lleve capturado en el formulario; solo cambia el logo.
      setForm((f) => ({ ...f, logoUrl: data.data.logoUrl }));
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
        <div id="domicilio-centro">
          <h2 className="font-semibold text-gray-800 mb-1">Domicilio del centro</h2>
          <p className="text-xs text-gray-400 mb-2">Obligatorio. Aparece en tickets y en la tienda en línea.</p>
          {!form.domicilio.codigoPostal && !form.domicilio.calle && (
            <p className="text-xs bg-amber-50 text-amber-800 rounded px-2 py-1 mb-2">
              Aún no has capturado el domicilio del centro.
              {form.direccionAnterior && <> Dirección anterior: {form.direccionAnterior}</>}
            </p>
          )}
          <DomicilioForm value={form.domicilio} errors={domicilioErrors}
            onChange={(d) => setForm((f) => ({ ...f, domicilio: d }))} />
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
        <h2 className="font-semibold text-gray-800">Tienda de apartados</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.apartadosActivo} onChange={(e) => setForm({ ...form, apartadosActivo: e.target.checked })} />
          Habilitar tienda de apartados publica
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enlace publico (slug)</label>
          <input className="input" value={form.slugPublico || ''} onChange={(e) => setForm({ ...form, slugPublico: e.target.value })} placeholder="mi-gimnasio" />
          {form.apartadosActivo && (
            <p className="text-xs text-gray-400 mt-1">{window.location.origin}/tienda/{form.slugPublico || '...'}</p>
          )}
        </div>
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
            Si al llegar esta hora alguien dejo un corte de caja abierto, el sistema lo cierra solo (sin contar: se entrega el efectivo esperado, marcado como "Sistema").
            Vacio = desactivado.
          </p>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={!!form.conteoCiego} onChange={(e) => setForm({ ...form, conteoCiego: e.target.checked })} />
          <span>
            <span className="text-sm font-medium text-gray-700">Conteo ciego</span>
            <span className="block text-xs text-gray-400">
              Mientras su corte está abierto, el cajero no ve cuánto efectivo debería haber: cuenta y cierra, y lo ve hasta después.
              Dueño y administradores siempre lo ven.
            </span>
          </span>
        </label>

        <button className="btn-primary w-full mt-2">Guardar cambios</button>
      </form>
    </div>
  );
}
