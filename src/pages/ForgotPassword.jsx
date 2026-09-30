import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-800 mb-4">Recuperar contrasena</h1>
        {sent ? (
          <div className="text-sm text-gray-600 space-y-2">
            <p>Si el correo existe en el sistema, te llegara un mensaje con un enlace para restablecer tu contrasena.</p>
            <p>
              Da clic en ese enlace; si no abre, copia el codigo que viene en el correo y pegalo en la{' '}
              <Link to="/reset-password" className="text-brand-600 hover:underline">pantalla de restablecer contrasena</Link>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        )}
        <Link to="/login" className="block text-center text-xs text-brand-600 hover:underline mt-4">
          Volver a iniciar sesion
        </Link>
      </div>
    </div>
  );
}
