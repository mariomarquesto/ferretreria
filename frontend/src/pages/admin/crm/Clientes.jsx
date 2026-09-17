import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { formatMoney, formatDate } from '../../../utils/format';
import Card from '../../../components/ui/Card';
import SearchInput from '../../../components/ui/SearchInput';

const SEGMENTO_ACTIVIDAD = {
  nuevo:    { label: '🆕 Nuevo',    color: 'bg-blue-100 text-blue-700' },
  activo:   { label: '✅ Activo',    color: 'bg-green-100 text-green-700' },
  tibio:    { label: '🌤️ Tibio',    color: 'bg-yellow-100 text-yellow-700' },
  frio:     { label: '❄️ Frío',     color: 'bg-orange-100 text-orange-700' },
  inactivo: { label: '💤 Inactivo', color: 'bg-red-100 text-red-700' }
};

const SEGMENTO_VALOR = {
  vip:        { label: '👑 VIP',         color: 'bg-purple-100 text-purple-700' },
  frecuente:  { label: '⭐ Frecuente',   color: 'bg-indigo-100 text-indigo-700' },
  ocasional:  { label: '🔹 Ocasional',  color: 'bg-blue-100 text-blue-700' },
  esporadico: { label: '🔸 Esporádico', color: 'bg-gray-100 text-gray-600' }
};

const TIPOS_CLIENTE = [
  { value: '', label: 'Todos los tipos' },
  { value: 'minorista', label: 'Minorista' },
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'profesional', label: 'Profesional' }
];

export default function CRMClientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [segmento, setSegmento] = useState(searchParams.get('segmento') || '');
  const [tipoCliente, setTipoCliente] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (segmento) params.segmento = segmento;
      if (tipoCliente) params.tipo_cliente = tipoCliente;
      const { data } = await api.get('/marketing/clientes', { params });
      setClientes(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [search, segmento, tipoCliente]);

  // Actualizar URL cuando cambia el segmento
  useEffect(() => {
    if (segmento) {
      setSearchParams({ segmento });
    } else {
      setSearchParams({});
    }
  }, [segmento]);

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            👥 Clientes — CRM
          </h1>
          <p className="text-gray-500 mt-1">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
            {segmento && ` · Filtro: ${SEGMENTO_ACTIVIDAD[segmento]?.label || SEGMENTO_VALOR[segmento]?.label || segmento}`}
          </p>
        </div>
        <Link
          to="/admin/crm"
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
        >
          ← Volver al dashboard
        </Link>
      </div>

      {/* Filtros rápidos por segmento */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSegmento('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            !segmento ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        {Object.entries(SEGMENTO_ACTIVIDAD).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setSegmento(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              segmento === key ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="w-px bg-gray-300 mx-1" />
        {Object.entries(SEGMENTO_VALOR).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setSegmento(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              segmento === key ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Buscador + tipo */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, email, teléfono o CUIT..."
            />
          </div>
          <select
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIPOS_CLIENTE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Tabla de clientes */}
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">❌ {error}</div>
        ) : clientes.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-5xl mb-3">👥</p>
            <p className="text-sm">No hay clientes que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Contacto</th>
                  <th className="py-3 px-3">Segmento</th>
                  <th className="py-3 px-3 text-right">Total comprado</th>
                  <th className="py-3 px-3 text-right">Compras</th>
                  <th className="py-3 px-3">Última compra</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{c.nombre}</p>
                          {c.cuit_dni && (
                            <p className="text-xs text-gray-400 font-mono">{c.cuit_dni}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs">
                        {c.telefono && <p className="text-gray-700">📞 {c.telefono}</p>}
                        {c.email && <p className="text-gray-500 truncate">✉️ {c.email}</p>}
                        {!c.telefono && !c.email && <p className="text-gray-400">-</p>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENTO_ACTIVIDAD[c.segmento_actividad]?.color}`}>
                          {SEGMENTO_ACTIVIDAD[c.segmento_actividad]?.label}
                        </span>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENTO_VALOR[c.segmento_valor]?.color}`}>
                          {SEGMENTO_VALOR[c.segmento_valor]?.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-green-700">
                      {formatMoney(c.total_comprado)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {c.cantidad_compras}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {c.ultima_compra ? formatDate(c.ultima_compra) : 'Nunca'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/admin/crm/clientes/${c.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Ver ficha →
                      </Link>
                    </td>
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