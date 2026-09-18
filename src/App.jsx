import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ChangePasswordRequired from './pages/ChangePasswordRequired.jsx';
import SelectCentro from './pages/SelectCentro.jsx';
import PublicCatalog from './pages/PublicCatalog.jsx';
import PublicApartar from './pages/PublicApartar.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Alumnos from './pages/Alumnos.jsx';
import AlumnoDetalle from './pages/AlumnoDetalle.jsx';
import Membresias from './pages/Membresias.jsx';
import Disciplinas from './pages/Disciplinas.jsx';
import Instructores from './pages/Instructores.jsx';
import Clases from './pages/Clases.jsx';
import Asistencia from './pages/Asistencia.jsx';
import Inventario from './pages/Inventario.jsx';
import Tienda from './pages/Tienda.jsx';
import Caja from './pages/Caja.jsx';
import Compras from './pages/Compras.jsx';
import Reportes from './pages/Reportes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Roles from './pages/Roles.jsx';
import Centros from './pages/Centros.jsx';
import CentroInfo from './pages/CentroInfo.jsx';

export default function App() {
  return (
    <Routes>
      {/* Publicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/tienda/:slug" element={<PublicCatalog />} />
      <Route path="/apartar/:slug" element={<PublicApartar />} />

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
        <Route path="/membresias" element={<PrivateRoute section="MEMBRESIAS"><Membresias /></PrivateRoute>} />
        <Route path="/disciplinas" element={<PrivateRoute section="DISCIPLINAS"><Disciplinas /></PrivateRoute>} />
        <Route path="/instructores" element={<PrivateRoute section="INSTRUCTORES"><Instructores /></PrivateRoute>} />
        <Route path="/clases" element={<PrivateRoute section="CLASES"><Clases /></PrivateRoute>} />
        <Route path="/asistencia" element={<PrivateRoute section="ASISTENCIA"><Asistencia /></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute section="INVENTARIO"><Inventario /></PrivateRoute>} />
        <Route path="/tienda" element={<PrivateRoute section="TIENDA"><Tienda /></PrivateRoute>} />
        <Route path="/caja" element={<PrivateRoute section="CAJA"><Caja /></PrivateRoute>} />
        <Route path="/compras" element={<PrivateRoute section="COMPRAS"><Compras /></PrivateRoute>} />
        <Route path="/reportes" element={<PrivateRoute section="REPORTES"><Reportes /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute section="USUARIOS"><Usuarios /></PrivateRoute>} />
        <Route path="/roles" element={<PrivateRoute section="ROLES"><Roles /></PrivateRoute>} />
        <Route path="/centros" element={<PrivateRoute superAdminOnly><Centros /></PrivateRoute>} />
        <Route path="/centro-info" element={<PrivateRoute adminOnly><CentroInfo /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
