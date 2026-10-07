import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../api/auth';
import { useNotify } from '../context/NotifyContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  // Si llega desde el enlace del correo (?token=...) se precarga solo; si el usuario
  // prefirio copiar el codigo a mano, el campo sigue editable igual que antes.
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useNotify();
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
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      notify('Contrasena actualizada, ya puedes iniciar sesion', 'success');
      navigate('/login');
    } catch (err) {
      notify(err.response?.data?.message || 'El codigo es invalido o expiro', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-800 mb-4">Restablecer contrasena</h1>
        <label className="block text-sm font-medium text-gray-700 mb-1">Codigo recibido por correo</label>
        <input className="input mb-4" value={token} onChange={(e) => setToken(e.target.value)} />
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
          {loading ? 'Guardando...' : 'Restablecer'}
        </button>
      </form>
    </div>
  );
}
