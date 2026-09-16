import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney } from '../../utils/format';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';

const emptyForm = {
  nombre: '',
  cuit_dni: '',
  telefono: '',
  email: '',
  direccion: '',
  limite_credito: 0
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await api.get('/clientes', { params });
      setClientes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [search]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      nombre: c.nombre || '',
      cuit_dni: c.cuit_dni || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      limite_credito: c.limite_credito || 0
    });
    setError('');
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = { ...form, limite_credito: Number(form.limite_credito) || 0 };
      if (editando) {
        await api.put(`/clientes/${editando.id}`, payload);
      } else {
        await api.post('/clientes', payload);
      }
      setModalOpen(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const columns = [
    { header: 'Nombre', render: (c) => (
      <div>
        <p className="font-medium text-gray-800">{c.nombre}</p>
        <p className="text-xs text-gray-400">{c.email || '-'}</p>
      </div>
    )},
    { header: 'CUIT/DNI', render: (c) => (
      <span className="text-xs font-mono">{c.cuit_dni || '-'}</span>
    )},
    { header: 'Teléfono', render: (c) => (
      <span className="text-sm">{c.telefono || '-'}</span>
    )},
    { header: 'Compras', align: 'right', render: (c) => (
      <span className="text-gray-600">{c.ventas_count}</span>
    )},
    { header: 'Total comprado', align: 'right', render: (c) => (
      <span className="font-semibold text-green-700">{formatMoney(c.total_comprado)}</span>
    )},
    { header: 'Saldo', align: 'right', render: (c) => (
      <span className={Number(c.saldo) > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
        {formatMoney(c.saldo)}
      </span>
    )},
    { header: '', align: 'right', render: (c) => (
      <div className="flex justify-end gap-2">
        <button onClick={() => abrirEditar(c)} className="text-blue-600 text-xs font-medium">Editar</button>
        <button onClick={() => eliminar(c.id)} className="text-red-600 text-xs font-medium">Eliminar</button>
      </div>
    )}
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">👥 Clientes</h1>
          <p className="text-gray-500 mt-1">{clientes.length} clientes</p>
        </div>
        <Button onClick={abrirNuevo}>➕ Nuevo cliente</Button>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, CUIT, email..." />
        </div>
        <Table columns={columns} data={clientes} loading={loading} emptyMessage="No hay clientes" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={guardar} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CUIT/DNI"
              value={form.cuit_dni}
              onChange={(e) => setForm({ ...form, cuit_dni: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />

          <Input
            label="Límite de crédito"
            type="number"
            step="0.01"
            value={form.limite_credito}
            onChange={(e) => setForm({ ...form, limite_credito: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}