import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDateTime } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';

export default function MisVentas() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('hoy');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const params = { usuario_id: user.id };

        const hoy = new Date();
        let desde = null;
        let hasta = null;

        if (filtroFecha === 'hoy') {
          desde = hoy.toISOString().slice(0, 10);
          hasta = desde;
        } else if (filtroFecha === 'semana') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          desde = d.toISOString().slice(0, 10);
        } else if (filtroFecha === 'mes') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          desde = d.toISOString().slice(0, 10);
        }

        if (desde) params.desde = `${desde}T00:00:00`;
        if (hasta) params.hasta = `${hasta}T23:59:59`;

        const { data } = await api.get('/ventas', { params });
        setVentas(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user.id, filtroFecha]);

  const filtradas = ventas.filter((v) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return (
      v.numero?.toLowerCase().includes(t) ||
      v.cliente?.toLowerCase().includes(t)
    );
  });

  const totalVendido = filtradas
    .filter((v) => v.estado === 'completada')
    .reduce((s, v) => s + Number(v.total), 0);

  const columns = [
    {
      header: 'Número',
      render: (v) => (
        <span className="font-mono text-xs font-semibold text-gray-700">
          {v.numero}
        </span>
      )
    },
    {
      header: 'Fecha',
      render: (v) => (
        <span className="text-xs text-gray-600">{formatDateTime(v.fecha)}</span>
      )
    },
    {
      header: 'Cliente',
      render: (v) => (
        v.cliente || <span className="text-gray-400">Consumidor final</span>
      )
    },
    {
      header: 'Items',
      align: 'right',
      render: (v) => (
        <span className="text-gray-600">{v.items_count}</span>
      )
    },
    {
      header: 'Total',
      align: 'right',
      render: (v) => (
        <span className="font-semibold text-gray-800">{formatMoney(v.total)}</span>
      )
    },
    {
      header: 'Estado',
      render: (v) => (
        <Badge color={
          v.estado === 'completada' ? 'green' :
          v.estado === 'anulada' ? 'red' :
          'yellow'
        }>
          {v.estado}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            📋 Mis Ventas
          </h1>
          <p className="text-gray-500 mt-1">
            {filtradas.length} {filtradas.length === 1 ? 'venta' : 'ventas'} · Total:{' '}
            <span className="font-semibold text-green-700">
              {formatMoney(totalVendido)}
            </span>
          </p>
        </div>
        <Button variant="outline" onClick={() => setFiltroFecha('hoy')}>
          🔄 Recargar
        </Button>
      </div>

      {/* Filtros de fecha */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'hoy', label: 'Hoy' },
          { id: 'semana', label: 'Últimos 7 días' },
          { id: 'mes', label: 'Últimos 30 días' },
          { id: 'todo', label: 'Todo' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroFecha(f.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${filtroFecha === f.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Listado */}
      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número o cliente..."
          />
        </div>
        <Table
          columns={columns}
          data={filtradas}
          loading={loading}
          emptyMessage="No tenés ventas registradas en este período"
        />
      </Card>
    </div>
  );
}