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
  cuit: '',
  telefono: '',
  email: '',
  direccion: '',
  contacto: ''
};

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
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
      const { data } = await api.get('/proveedores', { params });
      setProveedores(data);
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

  const abrirEditar = (p) => {
    setEditando(p);
    setForm({
      nombre: p.nombre || '',
      cuit: p.cuit || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      contacto: p.contacto || ''
    });
    setError('');
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/proveedores/${editando.id}`, form);
      } else {
        await api.post('/proveedores', form);
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
    if (!confirm('¿Eliminar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const columns = [
    { header: 'Proveedor', render: (p) => (
      <div>
        <p className="font-medium text-gray-800">{p.nombre}</p>
        <p className="text-xs text-gray-400">{p.contacto || '-'}</p>
      </div>
    )},
    { header: 'CUIT', render: (p) => (
      <span className="text-xs font-mono">{p.cuit || '-'}</span>
    )},
    { header: 'Contacto', render: (p) => (
      <div className="text-xs">
        <p>{p.telefono || '-'}</p>
        <p className="text-gray-400">{p.email || '-'}</p>
      </div>
    )},
    { header: 'Compras', align: 'right', render: (p) => p.compras_count },
    { header: 'Total comprado', align: 'right', render: (p) => (
      <span className="font-semibold">{formatMoney(p.total_comprado)}</span>
    )},
    { header: '', align: 'right', render: (p) => (
      <div className="flex justify-end gap-2">
        <button onClick={() => abrirEditar(p)} className="text-blue-600 text-xs font-medium">Editar</button>
        <button onClick={() => eliminar(p.id)} className="text-red-600 text-xs font-medium">Eliminar</button>
      </div>
    )}
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">🚚 Proveedores</h1>
          <p className="text-gray-500 mt-1">{proveedores.length} proveedores</p>
        </div>
        <Button onClick={abrirNuevo}>➕ Nuevo proveedor</Button>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, CUIT, contacto..." />
        </div>
        <Table columns={columns} data={proveedores} loading={loading} emptyMessage="No hay proveedores" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar proveedor' : 'Nuevo proveedor'}>
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
            <Input label="CUIT" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
            <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>

          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <Input label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />

          <Input label="Contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del vendedor" />

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