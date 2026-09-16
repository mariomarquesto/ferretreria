import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/admin/Login.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';

// Páginas admin
import Dashboard from './pages/admin/Dashboard.jsx';
import POS from './pages/admin/POS.jsx';
import Ventas from './pages/admin/Ventas.jsx';
import Productos from './pages/admin/Productos.jsx';
import Categorias from './pages/admin/Categorias.jsx';
import Marcas from './pages/admin/Marcas.jsx';
import Compras from './pages/admin/Compras.jsx';
import Proveedores from './pages/admin/Proveedores.jsx';
import Clientes from './pages/admin/Clientes.jsx';
import Gastos from './pages/admin/Gastos.jsx';
import Reportes from './pages/admin/Reportes.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="productos" element={<Productos />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="marcas" element={<Marcas />} />
        <Route path="compras" element={<Compras />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="reportes" element={<Reportes />} />
      </Route>

      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}