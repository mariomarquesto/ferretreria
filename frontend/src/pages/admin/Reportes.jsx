import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import api from '../../services/api';
import { formatMoney, formatNumber, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Helpers de fecha
const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
const toISO = (d) => d.toISOString().slice(0, 10);

const TABS = [
  { id: 'rentabilidad', label: '💰 Rentabilidad', icon: '💰' },
  { id: 'productos', label: '📦 Por producto', icon: '📦' },
  { id: 'flujo', label: '💵 Flujo de caja', icon: '💵' },
  { id: 'pagos', label: '💳 Formas de pago', icon: '💳' },
  { id: 'top', label: '🏆 Top productos', icon: '🏆' },
  { id: 'estancados', label: '🐌 Estancados', icon: '🐌' }
];

export default function Reportes() {
  const [tab, setTab] = useState('rentabilidad');
  const [desde, setDesde] = useState(toISO(primerDiaMes));
  const [hasta, setHasta] = useState(toISO(hoy));
  const [loading, setLoading] = useState(false);

  // Datos de cada reporte
  const [rentabilidad, setRentabilidad] = useState(null);
  const [utilidadProductos, setUtilidadProductos] = useState([]);
  const [flujoCaja, setFlujoCaja] = useState([]);
  const [porPago, setPorPago] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [estancados, setEstancados] = useState([]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [
        r, u, f, p, t, e
      ] = await Promise.all([
        api.get('/reportes/rentabilidad', { params: { desde, hasta } }),
        api.get('/reportes/utilidad-productos', { params: { desde, hasta, limit: 30 } }),
        api.get('/reportes/flujo-caja'),
        api.get('/ventas/estadisticas/forma-pago', { params: { desde, hasta } }),
        api.get('/ventas/estadisticas/top-productos', { params: { desde, hasta, limit: 15 } }),
        api.get('/reportes/dashboard')
      ]);

      setRentabilidad(r.data);
      setUtilidadProductos(u.data);
      setFlujoCaja(f.data);
      setPorPago(p.data);
      setTopProductos(t.data);
      setEstancados(e.data.productos_estancados || []);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [desde, hasta]);

  const exportarCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">📈 Reportes</h1>
          <p className="text-gray-500 mt-1">Análisis completo del negocio</p>
        </div>
      </div>

      {/* Filtro de fechas */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setDesde(toISO(primerDiaMes));
              setHasta(toISO(hoy));
            }}>Este mes</Button>
            <Button variant="outline" onClick={() => {
              const d = new Date(); d.setDate(d.getDate() - 30);
              setDesde(toISO(d));
              setHasta(toISO(hoy));
            }}>30 días</Button>
            <Button onClick={cargarTodo}>🔄 Actualizar</Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && (
        <>
          {tab === 'rentabilidad' && (
            <ReporteRentabilidad
              data={rentabilidad}
              onExport={() => exportarCSV(rentabilidad ? [rentabilidad] : [], 'rentabilidad.csv')}
            />
          )}

          {tab === 'productos' && (
            <ReporteUtilidadProductos
              data={utilidadProductos}
              onExport={() => exportarCSV(utilidadProductos, 'utilidad-productos.csv')}
            />
          )}

          {tab === 'flujo' && (
            <ReporteFlujoCaja
              data={flujoCaja}
              onExport={() => exportarCSV(flujoCaja, 'flujo-caja.csv')}
            />
          )}

          {tab === 'pagos' && (
            <ReporteFormasPago data={porPago} />
          )}

          {tab === 'top' && (
            <ReporteTopProductos
              data={topProductos}
              onExport={() => exportarCSV(topProductos, 'top-productos.csv')}
            />
          )}

          {tab === 'estancados' && (
            <ReporteEstancados
              data={estancados}
              onExport={() => exportarCSV(estancados, 'productos-estancados.csv')}
            />
          )}
        </>
      )}
    </div>
  );
}

// ==========================================================
// 1. RENTABILIDAD
// ==========================================================
function ReporteRentabilidad({ data, onExport }) {
  if (!data) return <div className="text-center py-10 text-gray-400">Sin datos</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo="Ingresos"
          valor={formatMoney(data.ingresos)}
          sub={`${data.cantidad_ventas} ventas`}
          color="from-blue-500 to-blue-600"
          icono="💰"
        />
        <StatCard
          titulo="Costo mercadería"
          valor={formatMoney(data.cmv)}
          sub="CMV"
          color="from-orange-500 to-orange-600"
          icono="📦"
        />
        <StatCard
          titulo="Ganancia bruta"
          valor={formatMoney(data.ganancia_bruta)}
          sub={`Margen: ${data.margen_bruto_pct}%`}
          color="from-green-500 to-green-600"
          icono="📈"
        />
        <StatCard
          titulo="Ganancia neta"
          valor={formatMoney(data.ganancia_neta)}
          sub={`Margen: ${data.margen_neto_pct}%`}
          color="from-purple-500 to-purple-600"
          icono="🏆"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          titulo="Gastos operativos"
          valor={formatMoney(data.gastos)}
          color="from-red-500 to-red-600"
          icono="💸"
        />
        <StatCard
          titulo="Compras del período"
          valor={formatMoney(data.compras)}
          color="from-slate-500 to-slate-600"
          icono="📥"
        />
        <StatCard
          titulo="Ticket promedio"
          valor={formatMoney(data.ticket_promedio)}
          color="from-indigo-500 to-indigo-600"
          icono="🧾"
        />
      </div>

      <Card
        title="Detalle del período"
        action={<Button variant="outline" size="sm" onClick={onExport}>📥 Exportar CSV</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Concepto</th>
                <th className="text-right py-2">Monto</th>
                <th className="text-right py-2">% s/ Ingresos</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Ingresos por ventas" value={Number(data.ingresos)} total={Number(data.ingresos)} />
              <Row label="(-) Costo mercadería vendida" value={-Number(data.cmv)} total={Number(data.ingresos)} negative />
              <Row label="= Ganancia bruta" value={Number(data.ganancia_bruta)} total={Number(data.ingresos)} bold />
              <Row label="(-) Gastos operativos" value={-Number(data.gastos)} total={Number(data.ingresos)} negative />
              <Row label="= Ganancia neta" value={Number(data.ganancia_neta)} total={Number(data.ingresos)} bold highlight />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, total, bold, negative, highlight }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
  return (
    <tr className={`border-b last:border-0 ${highlight ? 'bg-green-50' : ''}`}>
      <td className={`py-2 ${bold ? 'font-semibold' : ''}`}>{label}</td>
      <td className={`py-2 text-right ${negative ? 'text-red-600' : ''} ${bold ? 'font-semibold' : ''}`}>
        {formatMoney(value)}
      </td>
      <td className={`py-2 text-right text-gray-500 ${bold ? 'font-semibold' : ''}`}>{pct}%</td>
    </tr>
  );
}

// ==========================================================
// 2. UTILIDAD POR PRODUCTO
// ==========================================================
function ReporteUtilidadProductos({ data, onExport }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-gray-400">Sin datos en el período</div>;
  }

  const top10 = data.slice(0, 10).map((p) => ({
    nombre: p.nombre.length > 20 ? p.nombre.slice(0, 20) + '…' : p.nombre,
    ganancia: Number(p.ganancia),
    facturacion: Number(p.facturacion)
  }));

  const columns = [
    { header: '#', render: (_, i) => <span className="text-gray-400">{i + 1}</span> },
    { header: 'Producto', render: (p) => (
      <div>
        <p className="font-medium text-gray-800">{p.nombre}</p>
        <p className="text-xs text-gray-400">{p.codigo}</p>
      </div>
    )},
    { header: 'Uds.', align: 'right', render: (p) => p.unidades },
    { header: 'Facturación', align: 'right', render: (p) => formatMoney(p.facturacion) },
    { header: 'Costo', align: 'right', render: (p) => (
      <span className="text-gray-500">{formatMoney(p.costo)}</span>
    )},
    { header: 'Ganancia', align: 'right', render: (p) => (
      <span className="font-semibold text-green-700">{formatMoney(p.ganancia)}</span>
    )},
    { header: 'Margen', align: 'right', render: (p) => (
      <span className={`font-semibold ${Number(p.margen_pct) >= 30 ? 'text-green-600' : 'text-orange-600'}`}>
        {p.margen_pct}%
      </span>
    )}
  ];

  return (
    <div className="space-y-6">
      <Card title="Top 10 productos por ganancia">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Bar dataKey="ganancia" fill="#10b981" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title={`Detalle completo (${data.length} productos)`}
        action={<Button variant="outline" size="sm" onClick={onExport}>📥 Exportar CSV</Button>}
      >
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
}

// ==========================================================
// 3. FLUJO DE CAJA
// ==========================================================
function ReporteFlujoCaja({ data, onExport }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-gray-400">Sin datos</div>;
  }

  const chartData = data.map((d) => ({
    periodo: d.periodo,
    ventas: Number(d.ventas),
    compras: Number(d.compras),
    gastos: Number(d.gastos),
    ganancia_neta: Number(d.ganancia_neta)
  }));

  const totales = chartData.reduce(
    (acc, d) => ({
      ventas: acc.ventas + d.ventas,
      compras: acc.compras + d.compras,
      gastos: acc.gastos + d.gastos,
      ganancia_neta: acc.ganancia_neta + d.ganancia_neta
    }),
    { ventas: 0, compras: 0, gastos: 0, ganancia_neta: 0 }
  );

  const columns = [
    { header: 'Período', render: (d) => <span className="font-mono text-xs">{d.periodo}</span> },
    { header: 'Ventas', align: 'right', render: (d) => (
      <span className="text-blue-700 font-medium">{formatMoney(d.ventas)}</span>
    )},
    { header: 'Compras', align: 'right', render: (d) => (
      <span className="text-orange-600">{formatMoney(d.compras)}</span>
    )},
    { header: 'Gastos', align: 'right', render: (d) => (
      <span className="text-red-600">{formatMoney(d.gastos)}</span>
    )},
    { header: 'Ganancia bruta', align: 'right', render: (d) => formatMoney(d.ganancia_bruta) },
    { header: 'Ganancia neta', align: 'right', render: (d) => (
      <span className={`font-bold ${Number(d.ganancia_neta) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
        {formatMoney(d.ganancia_neta)}
      </span>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Ventas 12m" valor={formatMoney(totales.ventas)} color="from-blue-500 to-blue-600" icono="💰" />
        <StatCard titulo="Compras 12m" valor={formatMoney(totales.compras)} color="from-orange-500 to-orange-600" icono="📥" />
        <StatCard titulo="Gastos 12m" valor={formatMoney(totales.gastos)} color="from-red-500 to-red-600" icono="💸" />
        <StatCard
          titulo="Ganancia neta 12m"
          valor={formatMoney(totales.ganancia_neta)}
          color={totales.ganancia_neta >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}
          icono="🏆"
        />
      </div>

      <Card title="Evolución mensual (12 meses)">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Legend />
            <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas" />
            <Line type="monotone" dataKey="compras" stroke="#f59e0b" strokeWidth={2} name="Compras" />
            <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} name="Gastos" />
            <Line type="monotone" dataKey="ganancia_neta" stroke="#10b981" strokeWidth={3} name="Ganancia neta" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Detalle mensual"
        action={<Button variant="outline" size="sm" onClick={onExport}>📥 Exportar CSV</Button>}
      >
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
}

// ==========================================================
// 4. FORMAS DE PAGO
// ==========================================================
function ReporteFormasPago({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-gray-400">Sin ventas en el período</div>;
  }

  const chartData = data.map((d) => ({
    name: d.forma_pago,
    value: Number(d.total),
    cantidad: d.cantidad
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Distribución por forma de pago">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label={(entry) => `${entry.name}: ${((entry.value / total) * 100).toFixed(1)}%`}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(v)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Detalle">
        <div className="space-y-3">
          {chartData.map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(2);
            return (
              <div key={i}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium capitalize">{d.name}</span>
                  <span className="text-gray-500">{d.cantidad} ventas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-32 text-right">{formatMoney(d.value)}</span>
                  <span className="text-xs text-gray-500 w-14 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ==========================================================
// 5. TOP PRODUCTOS
// ==========================================================
function ReporteTopProductos({ data, onExport }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-gray-400">Sin ventas en el período</div>;
  }

  const chartData = data.slice(0, 10).map((p) => ({
    nombre: p.nombre.length > 18 ? p.nombre.slice(0, 18) + '…' : p.nombre,
    unidades: p.unidades_vendidas,
    facturacion: Number(p.facturacion)
  }));

  const columns = [
    { header: '#', render: (_, i) => (
      <span className={`font-bold ${i < 3 ? 'text-yellow-600' : 'text-gray-400'}`}>
        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
      </span>
    )},
    { header: 'Producto', render: (p) => (
      <div>
        <p className="font-medium">{p.nombre}</p>
        <p className="text-xs text-gray-400">{p.codigo}</p>
      </div>
    )},
    { header: 'Unidades', align: 'right', render: (p) => (
      <span className="font-semibold">{p.unidades_vendidas}</span>
    )},
    { header: 'Facturación', align: 'right', render: (p) => formatMoney(p.facturacion) },
    { header: 'Ganancia', align: 'right', render: (p) => (
      <span className="font-semibold text-green-700">{formatMoney(p.ganancia)}</span>
    )}
  ];

  return (
    <div className="space-y-6">
      <Card title="Top 10 por unidades vendidas">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="unidades" fill="#f59e0b" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title={`Ranking completo (${data.length} productos)`}
        action={<Button variant="outline" size="sm" onClick={onExport}>📥 Exportar CSV</Button>}
      >
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
}

// ==========================================================
// 6. PRODUCTOS ESTANCADOS
// ==========================================================
function ReporteEstancados({ data, onExport }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="text-center py-10">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-600">No hay productos estancados</p>
          <p className="text-sm text-gray-400 mt-1">Todos los productos tuvieron movimiento en los últimos 30 días</p>
        </div>
      </Card>
    );
  }

  const capitalTotal = data.reduce((s, p) => s + Number(p.capital_inmovilizado), 0);

  const columns = [
    { header: 'Producto', render: (p) => (
      <div>
        <p className="font-medium">{p.nombre}</p>
        <p className="text-xs text-gray-400">{p.codigo}</p>
      </div>
    )},
    { header: 'Stock', align: 'right', render: (p) => p.stock },
    { header: 'Capital', align: 'right', render: (p) => (
      <span className="font-semibold text-red-600">{formatMoney(p.capital_inmovilizado)}</span>
    )},
    { header: 'Última venta', align: 'right', render: (p) => (
      <span className="text-xs text-gray-500">{formatDate(p.ultima_venta)}</span>
    )},
    { header: 'Días sin venta', align: 'right', render: (p) => (
      <span className={`font-semibold ${p.dias_sin_venta > 90 ? 'text-red-600' : 'text-orange-600'}`}>
        {p.dias_sin_venta}
      </span>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          titulo="Productos estancados"
          valor={formatNumber(data.length)}
          sub="Sin venta +30 días"
          color="from-orange-500 to-orange-600"
          icono="🐌"
        />
        <StatCard
          titulo="Capital inmovilizado"
          valor={formatMoney(capitalTotal)}
          sub="Valor del stock parado"
          color="from-red-500 to-red-600"
          icono="💎"
        />
      </div>

      <Card
        title="Sugerencias: considerá promociones o liquidación"
        action={<Button variant="outline" size="sm" onClick={onExport}>📥 Exportar CSV</Button>}
      >
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
}