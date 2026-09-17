import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatMoney } from '../../utils/format';
import { fmtUnidad } from '../../utils/unidades';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function EmpleadoDashboard() {
  const { user } = useAuth();
  const [ventasHoy, setVentasHoy] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const hoy = new Date().toISOString().slice(0, 10);
        const [ventasRes, stockRes] = await Promise.all([
          api.get('/ventas', {
            params: {
              desde: `${hoy}T00:00:00`,
              hasta: `${hoy}T23:59:59`,
              usuario_id: user.id
            }
          }),
          api.get('/productos/stock-bajo')
        ]);
        setVentasHoy(ventasRes.data);
        setStockBajo(stockRes.data);
      } catch (err) {
        console.error('Error cargando dashboard empleado:', err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user.id]);

  const totalVendidoHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
  const cantidadVentasHoy = ventasHoy.length;
  const ticketPromedio = cantidadVentasHoy > 0 ? totalVendidoHoy / cantidadVentasHoy : 0;

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          👋 Hola, {user?.nombre?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1 capitalize">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      {/* Botón principal: Iniciar venta */}
      <Link to="/empleado/pos">
        <div className="bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-lg p-6 lg:p-8 transition-all active:scale-[0.98] cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Acción principal</p>
              <h2 className="text-2xl lg:text-3xl font-bold">🛒 Iniciar Venta</h2>
              <p className="text-sm opacity-90 mt-2">
                Abrí el POS y comenzá a vender
              </p>
            </div>
            <span className="text-6xl lg:text-7xl">🛒</span>
          </div>
        </div>
      </Link>

      {/* KPIs del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow">
          <p className="text-sm opacity-90">Vendido hoy</p>
          <p className="text-2xl lg:text-3xl font-bold mt-1">{formatMoney(totalVendidoHoy)}</p>
          <p className="text-xs opacity-80 mt-1">
            {cantidadVentasHoy} {cantidadVentasHoy === 1 ? 'venta' : 'ventas'}
          </p>
        </div>
        <div className="bg-linear-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow">
          <p className="text-sm opacity-90">Ticket promedio</p>
          <p className="text-2xl lg:text-3xl font-bold mt-1">{formatMoney(ticketPromedio)}</p>
          <p className="text-xs opacity-80 mt-1">Por venta</p>
        </div>
        <div className="bg-linear-to-br from-orange-500 to-orange-600 text-white p-5 rounded-xl shadow">
          <p className="text-sm opacity-90">Stock bajo</p>
          <p className="text-2xl lg:text-3xl font-bold mt-1">{stockBajo.length}</p>
          <p className="text-xs opacity-80 mt-1">Productos a reponer</p>
        </div>
      </div>

      {/* Mis ventas de hoy */}
      <Card
        title={`📋 Mis ventas de hoy (${cantidadVentasHoy})`}
        action={
          <Link to="/empleado/pos">
            <Button size="sm">➕ Nueva venta</Button>
          </Link>
        }
      >
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : ventasHoy.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-5xl mb-3">🛒</p>
            <p className="text-sm">Todavía no vendiste nada hoy</p>
            <p className="text-xs mt-1">Arrancá con el botón verde de arriba</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ventasHoy.slice(0, 10).map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-gray-500">{v.numero}</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {v.cliente || 'Consumidor final'}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-gray-800">{formatMoney(v.total)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(v.fecha).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {ventasHoy.length > 10 && (
              <Link
                to="/empleado/mis-ventas"
                className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2"
              >
                Ver todas mis ventas →
              </Link>
            )}
          </div>
        )}
      </Card>

      {/* Alerta de stock bajo */}
      {stockBajo.length > 0 && (
        <Card title="⚠️ Productos con stock bajo">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockBajo.slice(0, 9).map((p) => (
              <div
                key={p.id}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <p className="font-medium text-sm text-gray-800 line-clamp-2">
                  {p.nombre}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{p.codigo}</p>
                <p className="text-lg font-bold text-orange-600 mt-1">
                  {fmtUnidad(p.stock)} <span className="text-xs font-normal">disponibles</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 Avisale al encargado para que reponga estos productos
          </p>
        </Card>
      )}
    </div>
  );
}