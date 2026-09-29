import { Navigate, useSearchParams } from 'react-router-dom';

// "Tienda" dejo de ser una pantalla con pestañas: cada apartado (Vender, Ventas,
// Apartados, Catalogo publico) ahora es un destino de navegacion independiente
// (ver src/config/sections.js -> grupo "Ventas y tienda"). Este componente solo
// existe para no romper bookmarks/links viejos a /tienda?tab=X.
const TAB_A_RUTA = {
  catalogo: '/catalogo-publico',
  vender: '/punto-venta',
  ventas: '/ventas',
  cortes: '/cortes-caja',
  apartados: '/apartados',
};

export default function Tienda() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  return <Navigate to={TAB_A_RUTA[tab] || '/catalogo-publico'} replace />;
}
