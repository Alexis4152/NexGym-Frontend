import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as sucursalesApi from '../api/sucursales';
import { useAuth } from '../context/AuthContext.jsx';

// Sucursal ACTIVA (distinta de "sucursales autorizadas"): a donde entra un
// ADMIN/OPERATIVO despues de iniciar sesion, si tiene mas de una asignada (o
// ninguna, en cuyo caso no hay nada que elegir -- solo se muestra el aviso).
// Un Dueno/SUPER_ADMIN tambien puede entrar aqui voluntariamente (link "Cambiar
// sucursal") para fijar una concreta, o volver a "Todas las sucursales".
export default function SelectSucursal() {
  const [sucursales, setSucursales] = useState(null); // null = cargando
  const { selectSucursal, clearSelectedSucursal, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Ya viene acotada a las sucursales autorizadas del actor (SucursalService.listarActivas).
    sucursalesApi.listSucursalesActivas().then(({ data }) => setSucursales(data.data));
  }, []);

  function handleSelect(id) {
    selectSucursal(id);
    navigate('/');
  }

  function handleTodas() {
    clearSelectedSucursal();
    navigate('/');
  }

  if (sucursales === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }

  if (sucursales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <p className="text-3xl mb-3">🚫</p>
          <h1 className="text-lg font-bold text-gray-800 mb-2">No tienes una sucursal asignada</h1>
          <p className="text-sm text-gray-500 mb-4">
            Contacta al administrador de tu centro para que te asigne al menos una sucursal.
          </p>
          <button className="btn-secondary" onClick={logout}>Cerrar sesion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">¿En que sucursal vas a trabajar?</h1>
          {isAdmin && (
            <button className="btn-secondary text-sm" onClick={handleTodas}>Ver todas las sucursales</button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sucursales.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className="card text-left hover:border-brand-400 transition-colors"
            >
              <p className="font-semibold text-gray-800">{s.nombre}</p>
              {s.direccion && <p className="text-xs text-gray-500">{s.direccion}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
