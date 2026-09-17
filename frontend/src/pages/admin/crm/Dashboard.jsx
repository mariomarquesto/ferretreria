import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { formatMoney, formatDate } from '../../../utils/format';
import Card from '../../../components/ui/Card';

const SEGMENTO_COLOR = {
  nuevo: 'bg-blue-100 text-blue-700',
  activo: 'bg-green-100 text-green-700',
  tibio: 'bg-yellow-100 text-yellow-700',
  frio: 'bg-orange-100 text-orange-700',
  inactivo: 'bg-red-100 text-red-700',
  vip: 'bg-purple-100 text-purple-700',
  frecuente: 'bg-indigo-100 text-indigo-700',
  ocasional: 'bg-gray-100 text-gray-700',
  esporadico: 'bg-gray-100 text-gray-500'
};

export default function CRMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/marketing/dashboard');
        setData(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    cargar();
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            🎯 CRM — Gestión de Clientes
          </h1>
          <p className="text-gray-500 mt-1">
            Seguimiento, segmentación y comunicación con tus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/crm/clientes"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            👥 Ver clientes
          </Link>
          <Link
            to="/admin/crm/tareas"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
          >
            📋 Tareas
          </Link>
        </div>
      </div>

      {/* KPIs de segmentación */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          titulo="Total clientes"
          valor={data.segmentos.total}
          color="from-slate-600 to-slate-700"
          icono="👥"
        />
        <KpiCard
          titulo="Activos"
          valor={data.segmentos.activos}
          color="from-green-500 to-green-600"
          icono="✅"
          subtitulo="Últimos 30 días"
        />
        <KpiCard
          titulo="Tibios"
          valor={data.segmentos.tibios}
          color="from-yellow-500 to-yellow-600"
          icono="🌤️"
          subtitulo="30-60 días"
        />
        <KpiCard
          titulo="Fríos"
          valor={data.segmentos.frios}
          color="from-orange-500 to-orange-600"
          icono="❄️"
          subtitulo="60-90 días"
        />
        <KpiCard
          titulo="Inactivos"
          valor={data.segmentos.inactivos}
          color="from-red-500 to-red-600"
          icono="💤"
          subtitulo="+90 días"
        />
      </div>

      {/* KPIs por valor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          titulo="VIP"
          valor={data.segmentos.vip}
          color="from-purple-500 to-purple-600"
          icono="👑"
          subtitulo="+$500.000"
        />
        <KpiCard
          titulo="Frecuentes"
          valor={data.segmentos.frecuentes}
          color="from-indigo-500 to-indigo-600"
          icono="⭐"
          subtitulo="+$100.000"
        />
        <KpiCard
          titulo="Ocasionales"
          valor={data.segmentos.ocasionales}
          color="from-blue-500 to-blue-600"
          icono="🔹"
          subtitulo="+$20.000"
        />
        <KpiCard
          titulo="Esporádicos"
          valor={data.segmentos.esporadicos}
          color="from-gray-500 to-gray-600"
          icono="🔸"
          subtitulo="Menos de $20.000"
        />
      </div>

      {/* Segunda fila: Tareas + Comunicaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm opacity-90">📋 Tareas</h3>
            <Link
              to="/admin/crm/tareas"
              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
            >
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-3xl font-bold">{data.tareas.pendientes}</p>
              <p className="text-xs opacity-80 mt-1">Pendientes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-300">{data.tareas.hoy}</p>
              <p className="text-xs opacity-80 mt-1">Para hoy</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-300">{data.tareas.vencidas}</p>
              <p className="text-xs opacity-80 mt-1">Vencidas</p>
            </div>
          </div>
        </div>

        <div className="bg-linear-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm opacity-90">💬 Comunicaciones (7 días)</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-3xl font-bold">{data.comunicaciones.esta_semana}</p>
              <p className="text-xs opacity-80 mt-1">Total</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-300">{data.comunicaciones.enviadas}</p>
              <p className="text-xs opacity-80 mt-1">Enviadas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-200">{data.comunicaciones.recibidas}</p>
              <p className="text-xs opacity-80 mt-1">Recibidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 clientes + Clientes a contactar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 10 clientes */}
        <Card
          title="🏆 Top 10 clientes por facturación"
          action={
            <Link
              to="/admin/crm/clientes"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todos →
            </Link>
          }
        >
          {data.topClientes.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No hay clientes con compras registradas
            </div>
          ) : (
            <div className="space-y-2">
              {data.topClientes.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/admin/crm/clientes/${c.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900' :
                      i === 1 ? 'bg-gray-300 text-gray-700' :
                      i === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{c.nombre}</p>
                      <p className="text-xs text-gray-500">{c.compras} compras</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-700 shrink-0">
                    {formatMoney(c.total_comprado)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Clientes a contactar */}
        <Card title="⚠️ Clientes a contactar (inactivos +60 días)">
          {data.aContactar.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              <p className="text-4xl mb-2">✅</p>
              <p>Todos tus clientes compraron recientemente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.aContactar.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/crm/clientes/${c.id}`}
                  className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition border border-orange-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Última compra: {formatDate(c.ultima_compra)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-lg font-bold text-orange-600">{c.dias_sin_comprar}</p>
                    <p className="text-xs text-gray-500">días sin comprar</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Accesos rápidos */}
      <Card title="🚀 Accesos rápidos">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink to="/admin/crm/clientes" icono="👥" label="Clientes" color="blue" />
          <QuickLink to="/admin/crm/clientes?segmento=vip" icono="👑" label="VIP" color="purple" />
          <QuickLink to="/admin/crm/clientes?segmento=inactivo" icono="💤" label="Inactivos" color="red" />
          <QuickLink to="/admin/crm/tareas" icono="📋" label="Tareas" color="yellow" />
        </div>
      </Card>

    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function KpiCard({ titulo, valor, color, icono, subtitulo }) {
  return (
    <div className={`bg-linear-to-br ${color} text-white p-4 rounded-xl shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs opacity-90 leading-tight">{titulo}</p>
        <span className="text-xl">{icono}</span>
      </div>
      <p className="text-2xl font-bold">{valor}</p>
      {subtitulo && <p className="text-xs opacity-80 mt-1">{subtitulo}</p>}
    </div>
  );
}

function QuickLink({ to, icono, label, color }) {
  const colors = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800',
    red: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800'
  };

  return (
    <Link
      to={to}
      className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition ${colors[color]}`}
    >
      <span className="text-2xl">{icono}</span>
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}