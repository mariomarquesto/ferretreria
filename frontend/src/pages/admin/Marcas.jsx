import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export default function Marcas() {
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marcas');
      setMarcas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '' });
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (m) => {
    setEditando(m);
    setForm({ nombre: m.nombre });
    setError('');
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/marcas/${editando.id}`, form);
      } else {
        await api.post('/marcas', form);
      }
      setModalOpen(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar marca?')) return;
    await api.delete(`/marcas/${id}`);
    cargar();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">🏭 Marcas</h1>
          <p className="text-gray-500 mt-1">{marcas.length} marcas</p>
        </div>
        <Button onClick={abrirNuevo}>➕ Nueva marca</Button>
      </div>

      <Card>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {marcas.map((m) => (
              <div key={m.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition text-center">
                <h3 className="font-semibold text-gray-800">{m.nombre}</h3>
                <p className="text-xs text-gray-500 mt-1">{m.productos_count} productos</p>
                <div className="flex justify-center gap-2 mt-3 text-xs">
                  <button onClick={() => abrirEditar(m)} className="text-blue-600">Editar</button>
                  <button onClick={() => eliminar(m.id)} className="text-red-600">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar marca' : 'Nueva marca'} size="sm">
        <form onSubmit={guardar} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}