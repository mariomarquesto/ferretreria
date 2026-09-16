import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/pos', label: 'Punto de Venta', icon: '🛒' },
  { to: '/admin/ventas', label: 'Ventas', icon: '💰' },
  { to: '/admin/productos', label: 'Productos', icon: '📦' },
  { to: '/admin/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/admin/marcas', label: 'Marcas', icon: '🏭' },
  { to: '/admin/compras', label: 'Compras', icon: '📥' },
  { to: '/admin/proveedores', label: 'Proveedores', icon: '🚚' },
  { to: '/admin/clientes', label: 'Clientes', icon: '👤' },
  { to: '/admin/empleados', label: 'Empleados', icon: '👥' },
  { to: '/admin/gastos', label: 'Gastos', icon: '💸' },
  { to: '/admin/reportes', label: 'Reportes', icon: '📈' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay en mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-slate-900 text-white
          flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-xl">🔧</span>
          </div>
          <div>
            <h1 className="font-bold leading-tight">Ferretería</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-6 py-3 text-sm
                transition-colors
                ${isActive
                  ? 'bg-yellow-500 text-slate-900 font-semibold border-l-4 border-yellow-600'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-500">
          v1.0 · {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}