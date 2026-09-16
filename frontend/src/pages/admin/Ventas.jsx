import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';

const estadoColor = {
  completada: 'green',
  pendiente: 'yellow',
  anulada: 'red'
};

const formaPagoLabel = {
  efectivo: '💵 Efectivo',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  transferencia: '🏦 Transferencia',
  cta_cte: '📋 Cta. Cte.'
};

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      const { data } = await api.get('/ventas', { params });
      setVentas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filtroEstado]);

  const verDetalle = async (id) => {
    setDetalleLoading(true);
    setDetalle({ id }); // abrimos el modal
    try {
      const { data } = await api.get(`/ventas/${id}`);
      setDetalle(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetalleLoading(false);
    }
  };

  const anular = async (id) => {
    if (!confirm('¿Anular esta venta? Se devolverá el stock.')) return;
    try {
      await api.post(`/ventas/${id}/anular`, { motivo: 'anulación manual' });
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al anular');
    }
  };

  // Filtro local por número o cliente
  const filtradas = ventas.filter((v) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return (
      v.numero?.toLowerCase().includes(t) ||
      v.cliente?.toLowerCase().includes(t) ||
      v.vendedor?.toLowerCase().includes(t)
    );
  });

  const columns = [
    { header: 'Número', key: 'numero', render: (v) => (
      <span className="font-mono text-xs font-semibold text-gray-700">{v.numero}</span>
    )},
    { header: 'Fecha', render: (v) => (
      <span className="text-xs text-gray-600">{formatDateTime(v.fecha)}</span>
    )},
    { header: 'Cliente', render: (v) => (
      v.cliente || <span className="text-gray-400">Consumidor final</span>
    )},
    { header: 'Forma pago', render: (v) => (
      <span className="text-xs">{formaPagoLabel[v.forma_pago] || v.forma_pago}</span>
    )},
    { header: 'Items', align: 'right', render: (v) => (
      <span className="text-gray-600">{v.items_count}</span>
    )},
    { header: 'Total', align: 'right', render: (v) => (
      <span className="font-semibold text-gray-800">{formatMoney(v.total)}</span>
    )},
    { header: 'Ganancia', align: 'right', render: (v) => (
      <span className="font-semibold text-green-700">{formatMoney(v.ganancia)}</span>
    )},
    { header: 'Estado', render: (v) => (
      <Badge color={estadoColor[v.estado] || 'gray'}>{v.estado}</Badge>
    )},
    { header: '', align: 'right', render: (v) => (
      <div className="flex justify-end gap-1">
        <button
          onClick={() => verDetalle(v.id)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
        >
          Ver
        </button>
        {v.estado === 'completada' && (
          <button
            onClick={() => anular(v.id)}
            className="text-red-600 hover:text-red-800 text-xs font-medium ml-2"
          >
            Anular
          </button>
        )}
      </div>
    )}
  ];

  // Totales rápidos
  const totalFiltrado = filtradas.reduce((s, v) => s + Number(v.total), 0);
  const gananciaFiltrada = filtradas.reduce((s, v) => s + Number(v.ganancia), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">💰 Ventas</h1>
          <p className="text-gray-500 mt-1">
            {filtradas.length} ventas · Total: {formatMoney(totalFiltrado)} · Ganancia: <span className="text-green-700 font-semibold">{formatMoney(gananciaFiltrada)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="completada">Completadas</option>
            <option value="pendiente">Pendientes</option>
            <option value="anulada">Anuladas</option>
          </select>
          <Button variant="outline" onClick={cargar}>🔄 Recargar</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número, cliente o vendedor..."
          />
        </div>
        <Table
          columns={columns}
          data={filtradas}
          loading={loading}
          emptyMessage="No hay ventas registradas"
        />
      </Card>

      {/* Modal detalle */}
      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={`Detalle venta ${detalle?.numero || ''}`}
        size="lg"
      >
        {detalleLoading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : detalle ? (
          <div className="space-y-4">
            {/* Cabecera */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Cliente</p>
                <p className="font-medium">{detalle.cliente || 'Consumidor final'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Vendedor</p>
                <p className="font-medium">{detalle.vendedor || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Fecha</p>
                <p className="font-medium">{formatDateTime(detalle.fecha)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Forma de pago</p>
                <p className="font-medium">{formaPagoLabel[detalle.forma_pago] || detalle.forma_pago}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="font-semibold text-gray-700 mb-2">Productos</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2">Producto</th>
                      <th className="text-right px-3 py-2">Cant.</th>
                      <th className="text-right px-3 py-2">P. Unit.</th>
                      <th className="text-right px-3 py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.items?.map((it) => (
                      <tr key={it.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <p className="font-medium">{it.producto}</p>
                          <p className="text-xs text-gray-400">{it.codigo}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{it.cantidad}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(it.precio_unitario)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatMoney(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatMoney(detalle.subtotal)}</span>
              </div>
              {Number(detalle.descuento) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento</span>
                  <span>-{formatMoney(detalle.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">IVA</span>
                <span>{formatMoney(detalle.iva)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span className="text-blue-700">{formatMoney(detalle.total)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Ganancia</span>
                <span>{formatMoney(detalle.ganancia)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}