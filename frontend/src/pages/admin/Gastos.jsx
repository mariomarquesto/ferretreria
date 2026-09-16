import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [porTipo, setPorTipo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ tipo_id: '', descripcion: '', monto: '', fecha: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const [gRes, tRes, rRes, ptRes] = await Promise.all([
        api.get('/gastos'),
        api.get('/gastos/tipos'),
        api.get('/gastos/resumen'),
        api.get('/gastos/estadisticas/tipos')
      ]);
      setGastos(gRes.data);
      setTipos(tRes.data);
      setResumen(rRes.data);
      setPorTipo(ptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api.post('/gastos', {
        ...form,
        tipo_id: Number(form.tipo_id),
        monto: Number(form.monto),
        fecha: form.fecha || undefined
      });
      setModalOpen(false);
      setForm({ tipo_id: '', descripcion: '', monto: '', fecha: '' });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/gastos/${id}`);
      cargar();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const columns = [
    { header: 'Fecha', render: (g) => (
      <span className="text-xs text-gray-600">{formatDate(g.fecha)}</span>
    )},
    { header: 'Tipo', render: (g) => (
      <Badge color="purple">{g.tipo || '-'}</Badge>
    )},
    { header: 'Descripción', render: (g) => (
      <span className="text-sm">{g.descripcion || '-'}</span>
    )},
    { header: 'Monto', align: 'right', render: (g) => (
      <span className="font-semibold text-red-600">{formatMoney(g.monto)}</span>
    )},
    { header: '', align: 'right', render: (g) => (
      <button onClick={() => eliminar(g.id)} className="text-red-600 text-xs font-medium">
        Eliminar
      </button>
    )}
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">💸 Gastos</h1>
          <p className="text-gray-500 mt-1">{gastos.length} gastos registrados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>➕ Nuevo gasto</Button>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            titulo="Mes actual"
            valor={formatMoney(resumen.mes_actual.total)}
            sub={`${resumen.mes_actual.cantidad} gastos`}
            color="from-red-500 to-red-600"
            icono="📆"
          />
          <StatCard
            titulo="Mes anterior"
            valor={formatMoney(resumen.mes_anterior.total)}
            sub={`Variación: ${resumen.variacion_pct}%`}
            color="from-orange-500 to-orange-600"
            icono="📅"
          />
          <StatCard
            titulo="Año actual"
            valor={formatMoney(resumen.anio_actual.total)}
            sub={`${resumen.anio_actual.cantidad} gastos`}
            color="from-slate-600 to-slate-700"
            icono="📊"
          />
        </div>
      )}

      {/* Por tipo */}
      {porTipo.length > 0 && (
        <Card title="Gastos por tipo">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porTipo.map((t) => (
              <div key={t.tipo_id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-gray-800">{t.tipo}</p>
                <p className="text-xs text-gray-500">{t.categoria}</p>
                <p className="text-lg font-bold text-red-600 mt-1">{formatMoney(t.total)}</p>
                <p className="text-xs text-gray-400">{t.cantidad} registros</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Historial">
        <Table columns={columns} data={gastos} loading={loading} emptyMessage="No hay gastos" />
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo gasto">
        <form onSubmit={guardar} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={form.tipo_id}
              onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <Input
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto *"
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              required
            />
            <Input
              label="Fecha (opcional)"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}