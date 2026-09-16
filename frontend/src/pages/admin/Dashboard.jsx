import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatNumber } from '../../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/reportes/dashboard');
        setData(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          ❌ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general del negocio</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Ventas hoy"
          valor={formatMoney(data.ventas_hoy.total)}
          sub={`${data.ventas_hoy.cantidad} ventas`}
          color="from-blue-500 to-blue-600"
          icono="💵"
        />
        <KpiCard
          titulo="Ventas del mes"
          valor={formatMoney(data.ventas_mes.total)}
          sub={`${data.ventas_mes.cantidad} ventas`}
          color="from-green-500 to-green-600"
          icono="📈"
        />
        <KpiCard
          titulo="Ganancia neta mes"
          valor={formatMoney(data.ventas_mes.ganancia_neta)}
          sub={`Bruta: ${formatMoney(data.ventas_mes.ganancia)}`}
          color="from-purple-500 to-purple-600"
          icono="🏆"
        />
        <KpiCard
          titulo="Gastos del mes"
          valor={formatMoney(data.gastos_mes.total)}
          sub={`Compras: ${formatMoney(data.compras_mes.total)}`}
          color="from-red-500 to-red-600"
          icono="💸"
        />
      </div>

      {/* Segunda fila KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Productos activos"
          valor={formatNumber(data.total_productos)}
          sub="En catálogo"
          color="from-slate-600 to-slate-700"
          icono="📦"
        />
        <KpiCard
          titulo="Valor inventario"
          valor={formatMoney(data.valor_inventario.costo)}
          sub={`Venta potencial: ${formatMoney(data.valor_inventario.venta_potencial)}`}
          color="from-indigo-500 to-indigo-600"
          icono="💎"
        />
        <KpiCard
          titulo="Stock bajo"
          valor={formatNumber(data.stock_bajo.length)}
          sub="Reponer urgente"
          color="from-orange-500 to-orange-600"
          icono="⚠️"
        />
        <KpiCard
          titulo="Productos estancados"
          valor={formatNumber(data.productos_estancados.length)}
          sub="+30 días sin venta"
          color="from-yellow-600 to-yellow-700"
          icono="🐌"
        />
      </div>

      {/* Top productos + Stock bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card titulo="🏆 Top 10 productos (30 días)">
          {data.top_productos.length === 0 ? (
            <EmptyState>Sin ventas registradas</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Uds.</th>
                    <th className="pb-2 text-right">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_productos.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">
                        <p className="font-medium text-gray-800">{p.nombre}</p>
                        <p className="text-xs text-gray-400">{p.codigo}</p>
                      </td>
                      <td className="py-2 text-right font-semibold">{p.unidades_vendidas}</td>
                      <td className="py-2 text-right text-green-700 font-semibold">
                        {formatMoney(p.facturacion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card titulo="⚠️ Reposición urgente">
          {data.stock_bajo.length === 0 ? (
            <EmptyState>Todo con stock suficiente ✅</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {data.stock_bajo.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 bg-orange-50 border border-orange-100 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.codigo} · {p.ubicacion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{p.stock}</p>
                    <p className="text-xs text-gray-500">mín {p.stock_minimo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Productos estancados */}
      <Card titulo="🐌 Productos sin movimiento (+30 días)">
        {data.productos_estancados.length === 0 ? (
          <EmptyState>Sin productos estancados ✅</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Capital inmovilizado</th>
                  <th className="pb-2 text-right">Días sin venta</th>
                </tr>
              </thead>
              <tbody>
                {data.productos_estancados.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-red-50/50">
                    <td className="py-2">
                      <p className="font-medium text-gray-800">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.codigo}</p>
                    </td>
                    <td className="py-2 text-right">{p.stock}</td>
                    <td className="py-2 text-right text-red-600 font-semibold">
                      {formatMoney(p.capital_inmovilizado)}
                    </td>
                    <td className="py-2 text-right text-gray-600">{p.dias_sin_venta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Componentes auxiliares ----------

function KpiCard({ titulo, valor, sub, color, icono }) {
  return (
    <div className={`bg-linear-to-br ${color} text-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm opacity-90">{titulo}</p>
        <span className="text-2xl">{icono}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{valor}</p>
      <p className="text-xs opacity-80 mt-1">{sub}</p>
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-bold text-gray-800 mb-4">{titulo}</h2>
      {children}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="py-10 text-center text-gray-400 text-sm">{children}</div>
  );
}