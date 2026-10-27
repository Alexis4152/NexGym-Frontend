import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotifyContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { confirmarAccion } from '../utils/confirmaciones.js';

export default function ChangePasswordRequired() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();
  const { notify, confirmDialog } = useNotify();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      notify('La contrasena debe tener al menos 8 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Las contrasenas no coinciden', 'error');
      return;
    }
    if (!(await confirmarAccion(confirmDialog, '¿Guardar tu nueva contraseña?', { title: 'Confirmar cambio', confirmLabel: 'Sí, guardar' }))) return;
    setLoading(true);
    try {
      await authApi.changePassword(null, newPassword);
      setUser({ ...user, mustChangePassword: false });
      notify('Contrasena actualizada', 'success');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-800 mb-2">Cambia tu contrasena</h1>
        <p className="text-sm text-gray-500 mb-4">Por seguridad debes definir una contrasena nueva.</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena</label>
        <PasswordInput
          className="mb-4"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
        <PasswordInput
          className="mb-4"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  );
}
