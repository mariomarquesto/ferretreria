import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MENU_EMPLEADO = [
  { to: '/empleado/dashboard', label: 'Inicio', icon: '🏠' },
  { to: '/empleado/pos', label: 'Nueva Venta', icon: '🛒' },
  { to: '/empleado/mis-ventas', label: 'Mis Ventas', icon: '📋' },
  { to: '/empleado/productos', label: 'Consultar Stock', icon: '📦' },
];

export default function EmpleadoLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-linear-to-b from-blue-900 to-blue-800 text-white
          flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-blue-800 shrink-0">
          <div className="w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-xl">🔧</span>
          </div>
          <div>
            <h1 className="font-bold leading-tight">Ferretería</h1>
            <p className="text-xs text-blue-300">Panel Empleado</p>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto py-4">
          {MENU_EMPLEADO.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-6 py-3 text-sm
                transition-colors
                ${isActive
                  ? 'bg-yellow-500 text-blue-900 font-semibold border-l-4 border-yellow-600'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white border-l-4 border-transparent'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-yellow-500 text-blue-900 flex items-center justify-center font-bold">
              {user?.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.nombre}</p>
              <p className="text-xs text-blue-300">Empleado</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-blue-300 hover:text-white py-1"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="font-semibold text-gray-800">Panel Empleado</h2>
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {user?.nombre?.charAt(0)?.toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}