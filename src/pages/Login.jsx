import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Ingresa tu correo y contrasena');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      navigate('/');
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || 'Credenciales invalidas');
      } else {
        setError('No se pudo conectar con el servidor. Verifica tu conexion e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h1 className="text-xl font-bold text-brand-700 mb-1">NexoraSport</h1>
        <p className="text-sm text-gray-500 mb-6">Gestion de centros deportivos</p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
        <input className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
        <PasswordInput
          className="mb-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
          Olvide mi contrasena
        </Link>

        <button className="btn-primary w-full mt-5" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <Link to="/arco" className="block text-center text-xs text-gray-400 hover:text-brand-600 hover:underline mt-4">
          Aviso de privacidad y derechos ARCO
        </Link>
      </form>
    </div>
  );
}
