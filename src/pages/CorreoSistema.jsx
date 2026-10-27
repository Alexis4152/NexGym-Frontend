import { useEffect, useState } from 'react';
import { getMailConfig, testMailConfig, updateMailConfig } from '../api/mailConfig';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';

// Cuenta SMTP unica con la que el backend manda TODOS los correos de la plataforma (alta de
// usuarios, recuperacion de contrasena, tickets, notificaciones). Vive en la tabla
// mail_config y solo la edita SUPER_ADMIN (PrivateRoute superAdminOnly en App.jsx), igual
// que la pantalla MailSettings de DemoPV. smtpPassword es de solo escritura: el backend
// nunca la devuelve; dejar el campo vacio conserva la que ya esta guardada.
export default function CorreoSistema() {
  const { user } = useAuth();
  const { notify, confirmDialog } = useNotify();
  const [form, setForm] = useState(null);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getMailConfig().then(({ data }) => {
      const cfg = data.data;
      setForm({ enabled: cfg.enabled, smtpHost: cfg.smtpHost, smtpPort: cfg.smtpPort, smtpUsername: cfg.smtpUsername || '' });
      setPasswordConfigured(cfg.passwordConfigured);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const ok = await confirmDialog(
      'Estos cambios afectan el envío de correo de TODOS los centros (accesos de usuarios, recuperación de contraseña, tickets, notificaciones). ¿Continuar?',
      { confirmLabel: 'Guardar configuración', danger: true },
    );
    if (!ok) return;
    setSaving(true);
    try {
      const payload = { ...form, smtpPort: Number(form.smtpPort) };
      if (newPassword.trim()) payload.smtpPassword = newPassword.trim();
      const { data } = await updateMailConfig(payload);
      setPasswordConfigured(data.data.passwordConfigured);
      setNewPassword('');
      notify('Configuración de correo actualizada', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!(await confirmDialog(`¿Enviar un correo de prueba a ${user?.email || 'tu correo'}?`,
      { title: 'Confirmar envío', confirmLabel: 'Sí, enviar' }))) return;
    setTesting(true);
    try {
      const { data } = await testMailConfig();
      notify(data.message || 'Correo de prueba enviado', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar el correo de prueba', 'error');
    } finally {
      setTesting(false);
    }
  }

  if (!form) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Correo del sistema</h1>
      <p className="text-gray-500 text-sm mb-6">
        Cuenta SMTP única con la que salen los correos de <span className="font-medium">todos los centros</span>:
        accesos de usuarios nuevos, recuperación de contraseña, tickets y notificaciones.
      </p>

      <form onSubmit={handleSave} className="card space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span className="text-sm font-semibold text-gray-800">Envío de correo habilitado</span>
        </label>
        <p className="text-xs text-gray-500 -mt-2">
          Si lo apagas, el sistema sigue funcionando normal pero ningún correo sale — solo queda registrado en el log del servidor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Host SMTP</label>
            <input type="text" className="input" required value={form.smtpHost}
              onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
            <input type="number" className="input" required value={form.smtpPort}
              onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta (usuario)</label>
            <input type="email" className="input" required value={form.smtpUsername}
              onChange={(e) => setForm({ ...form, smtpUsername: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" className="input" autoComplete="new-password"
              placeholder={passwordConfigured ? 'Ya hay una guardada — déjalo en blanco para conservarla' : 'Sin configurar'}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">
              Para Gmail no es tu contraseña normal: es una "contraseña de aplicación" de 16 caracteres, generada en
              la seguridad de esa cuenta de Google (requiere verificación en 2 pasos).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          <button type="button" className="btn-secondary" disabled={testing || saving} onClick={handleTest}>
            {testing ? 'Enviando...' : 'Enviar correo de prueba'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          La prueba usa la configuración <span className="font-medium">ya guardada</span> y se envía a {user?.email}.
        </p>
      </form>
    </div>
  );
}
