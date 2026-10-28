import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ChangePasswordRequired from './pages/ChangePasswordRequired.jsx';
import SelectCentro from './pages/SelectCentro.jsx';
import SelectSucursal from './pages/SelectSucursal.jsx';
import PublicApartar from './pages/PublicApartar.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Alumnos from './pages/Alumnos.jsx';
import AlumnoDetalle from './pages/AlumnoDetalle.jsx';
import Membresias from './pages/Membresias.jsx';
import Planes from './pages/Planes.jsx';
import Disciplinas from './pages/Disciplinas.jsx';
import Instructores from './pages/Instructores.jsx';
import Clases from './pages/Clases.jsx';
import Disponibilidad from './pages/Disponibilidad.jsx';
import Instalaciones from './pages/Instalaciones.jsx';
import Sucursales from './pages/Sucursales.jsx';
import Asistencia from './pages/Asistencia.jsx';
import Inventario from './pages/Inventario.jsx';
import Tienda from './pages/Tienda.jsx';
import VentaPos from './pages/VentaPos.jsx';
import Ventas from './pages/Ventas.jsx';
import Apartados from './pages/Apartados.jsx';
import CatalogoPublico from './pages/CatalogoPublico.jsx';
import CortesCaja from './pages/CortesCaja.jsx';
import Caja from './pages/Caja.jsx';
import Compras from './pages/Compras.jsx';
import Proveedores from './pages/Proveedores.jsx';
import Reportes from './pages/Reportes.jsx';
import Notificaciones from './pages/Notificaciones.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Roles from './pages/Roles.jsx';
import Centros from './pages/Centros.jsx';
import CentroInfo from './pages/CentroInfo.jsx';
import CorreoSistema from './pages/CorreoSistema.jsx';
import ArcoSolicitud from './pages/ArcoSolicitud.jsx';
import ArcoSeguimiento from './pages/ArcoSeguimiento.jsx';
import MisSolicitudesArco from './pages/MisSolicitudesArco.jsx';
import SolicitudesArco from './pages/SolicitudesArco.jsx';

export default function App() {
  return (
    <Routes>
      {/* Publicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/tienda/:slug" element={<PublicApartar />} />
      {/* Derechos ARCO: de la plataforma, sin centro ni sesion (el link del correo es la credencial) */}
      <Route path="/arco" element={<ArcoSolicitud />} />
      <Route path="/arco/seguimiento/:token" element={<ArcoSeguimiento />} />

      {/* Autenticadas, sin sidebar */}
      <Route
        path="/change-password"
        element={
          <PrivateRoute>
            <ChangePasswordRequired />
          </PrivateRoute>
        }
      />
      <Route
        path="/select-centro"
        element={
          <PrivateRoute>
            <SelectCentro />
          </PrivateRoute>
        }
      />
      <Route
        path="/select-sucursal"
        element={
          <PrivateRoute>
            <SelectSucursal />
          </PrivateRoute>
        }
      />

      {/* App principal */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<PrivateRoute section="DASHBOARD"><Dashboard /></PrivateRoute>} />
        <Route path="/alumnos" element={<PrivateRoute section="ALUMNOS"><Alumnos /></PrivateRoute>} />
        <Route path="/alumnos/:id" element={<PrivateRoute section="ALUMNOS"><AlumnoDetalle /></PrivateRoute>} />

        {/* Membresias y cobranza */}
        <Route path="/membresias" element={<PrivateRoute section="MEMBRESIAS"><Membresias /></PrivateRoute>} />
        <Route path="/planes" element={<PrivateRoute section="MEMBRESIAS"><Planes /></PrivateRoute>} />

        {/* Gestion deportiva */}
        <Route path="/disciplinas" element={<PrivateRoute section="DISCIPLINAS"><Disciplinas /></PrivateRoute>} />
        <Route path="/instructores" element={<PrivateRoute section="INSTRUCTORES"><Instructores /></PrivateRoute>} />
        <Route path="/clases" element={<PrivateRoute section="CLASES"><Clases /></PrivateRoute>} />
        <Route path="/instalaciones" element={<PrivateRoute section="CLASES"><Instalaciones /></PrivateRoute>} />
        <Route path="/disponibilidad" element={<PrivateRoute section="CLASES"><Disponibilidad /></PrivateRoute>} />
        <Route path="/asistencia" element={<PrivateRoute section="ASISTENCIA"><Asistencia /></PrivateRoute>} />

        {/* Ventas y tienda (antes: pestañas dentro de /tienda) */}
        <Route path="/tienda" element={<PrivateRoute section="TIENDA"><Tienda /></PrivateRoute>} />
        <Route path="/punto-venta" element={<PrivateRoute section="TIENDA"><VentaPos /></PrivateRoute>} />
        <Route path="/ventas" element={<PrivateRoute section="TIENDA"><Ventas /></PrivateRoute>} />
        <Route path="/apartados" element={<PrivateRoute section={['TIENDA', 'MEMBRESIAS']}><Apartados /></PrivateRoute>} />
        <Route path="/catalogo-publico" element={<PrivateRoute section="TIENDA"><CatalogoPublico /></PrivateRoute>} />

        {/* Inventario y compras */}
        <Route path="/inventario" element={<PrivateRoute section="INVENTARIO"><Inventario /></PrivateRoute>} />
        <Route path="/compras" element={<PrivateRoute section="COMPRAS"><Compras /></PrivateRoute>} />
        <Route path="/proveedores" element={<PrivateRoute section="COMPRAS"><Proveedores /></PrivateRoute>} />

        {/* Caja y finanzas (Cortes de caja vivia en /tienda?tab=cortes) */}
        <Route path="/caja" element={<PrivateRoute section="CAJA"><Caja /></PrivateRoute>} />
        <Route path="/cortes-caja" element={<PrivateRoute section="TIENDA"><CortesCaja /></PrivateRoute>} />

        {/* Reportes: cada sub-reporte es su propia ruta, mismo componente Reportes.jsx */}
        <Route path="/reportes" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/reportes/finanzas" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/reportes/tienda" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/reportes/membresias" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/reportes/alumnos" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/reportes/operacion" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />

        <Route path="/notificaciones" element={<PrivateRoute section="NOTIFICACIONES"><Notificaciones /></PrivateRoute>} />

        {/* Administracion */}
        <Route path="/usuarios" element={<PrivateRoute section="USUARIOS"><Usuarios /></PrivateRoute>} />
        <Route path="/roles" element={<PrivateRoute section="ROLES"><Roles /></PrivateRoute>} />
        <Route path="/centro-info" element={<PrivateRoute adminOnly><CentroInfo /></PrivateRoute>} />
        <Route path="/sucursales" element={<PrivateRoute section="CLASES"><Sucursales /></PrivateRoute>} />
        <Route path="/centros" element={<PrivateRoute superAdminOnly><Centros /></PrivateRoute>} />
        <Route path="/correo-sistema" element={<PrivateRoute superAdminOnly><CorreoSistema /></PrivateRoute>} />
        <Route path="/solicitudes-arco" element={<PrivateRoute superAdminOnly><SolicitudesArco /></PrivateRoute>} />
        <Route path="/mis-solicitudes-arco" element={<PrivateRoute><MisSolicitudesArco /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
