import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney } from '../../utils/format';
import { fmtUnidad } from '../../utils/unidades';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';

const emptyForm = {
  codigo: '',
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  categoria_id: '',
  marca_id: '',
  precio_compra: '',
  precio_venta: '',
  iva: 21,
  stock: 0,
  stock_minimo: 5,
  stock_maximo: 100,
  ubicacion: '',
  imagen_url: '',
  activo: true
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargarCatalogos = async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        api.get('/categorias'),
        api.get('/marcas')
      ]);
      setCategorias(cRes.data);
      setMarcas(mRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filtroCategoria) params.categoria_id = filtroCategoria;
      const { data } = await api.get('/productos', { params });
      setProductos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [search, filtroCategoria]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setErrorForm('');
    setModalOpen(true);
  };

  const abrirEditar = (prod) => {
    setEditando(prod);
    setForm({
      codigo: prod.codigo || '',
      codigo_barras: prod.codigo_barras || '',
      nombre: prod.nombre || '',
      descripcion: prod.descripcion || '',
      categoria_id: prod.categoria_id || '',
      marca_id: prod.marca_id || '',
      precio_compra: prod.precio_compra || '',
      precio_venta: prod.precio_venta || '',
      iva: prod.iva || 21,
      stock: prod.stock || 0,
      stock_minimo: prod.stock_minimo || 5,
      stock_maximo: prod.stock_maximo || 100,
      ubicacion: prod.ubicacion || '',
      imagen_url: prod.imagen_url || '',
      activo: prod.activo !== false
    });
    setErrorForm('');
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm('');
    setGuardando(true);

    try {
      const payload = {
        ...form,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        marca_id: form.marca_id ? Number(form.marca_id) : null,
        precio_compra: Number(form.precio_compra) || 0,
        precio_venta: Number(form.precio_venta) || 0,
        iva: Number(form.iva) || 21,
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 5,
        stock_maximo: Number(form.stock_maximo) || 100
      };

      if (editando) {
        await api.put(`/productos/${editando.id}`, payload);
      } else {
        await api.post('/productos', payload);
      }

      setModalOpen(false);
      cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const columns = [
    { header: 'Código', key: 'codigo', render: (p) => (
      <span className="font-mono text-xs">{p.codigo}</span>
    )},
    { header: 'Producto', render: (p) => (
      <div>
        <p className="font-medium text-gray-800">{p.nombre}</p>
        <p className="text-xs text-gray-400">{p.categoria}</p>
      </div>
    )},
    { header: 'Marca', render: (p) => (
      <span className="text-gray-600 text-xs">{p.marca || '-'}</span>
    )},
    { header: 'P. Compra', align: 'right', render: (p) => (
      <span className="text-gray-600 text-xs">{formatMoney(p.precio_compra)}</span>
    )},
    { header: 'P. Venta', align: 'right', render: (p) => (
      <span className="font-semibold">{formatMoney(p.precio_venta)}</span>
    )},
    { header: 'Stock', align: 'right', render: (p) => (
      <Badge color={Number(p.stock) <= Number(p.stock_minimo) ? 'red' : 'green'}>
        {Number(p.stock).toFixed(p.permite_decimales ? 2 : 0).replace(/\.?0+$/, '')} {fmtUnidad(p.unidad)}
      </Badge>
    )},
    { header: 'Presentación', render: (p) => (
      <span className="text-xs text-gray-500">
        {p.presentacion || 'Unidad'}
      </span>
    )},
    { header: 'Ubicación', render: (p) => (
      <span className="text-xs text-gray-500">{p.ubicacion || '-'}</span>
    )},
    { header: '', align: 'right', render: (p) => (
      <div className="flex justify-end gap-2">
        <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
          Editar
        </button>
        <button onClick={() => eliminar(p.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">
          Eliminar
        </button>
      </div>
    )}
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">📦 Productos</h1>
          <p className="text-gray-500 mt-1">{productos.length} productos</p>
        </div>
        <Button onClick={abrirNuevo}>➕ Nuevo producto</Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o código..."
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <Table columns={columns} data={productos} loading={loading} emptyMessage="No hay productos" />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? `Editar: ${editando.nombre}` : 'Nuevo producto'}
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          {errorForm && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errorForm}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código *"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              required
            />
            <Input
              label="Código de barras"
              value={form.codigo_barras}
              onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
            />
          </div>

          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select
                value={form.marca_id}
                onChange={(e) => setForm({ ...form, marca_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin marca</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Precio compra"
              type="number"
              step="0.01"
              value={form.precio_compra}
              onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
            />
            <Input
              label="Precio venta *"
              type="number"
              step="0.01"
              value={form.precio_venta}
              onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              required
            />
            <Input
              label="IVA %"
              type="number"
              value={form.iva}
              onChange={(e) => setForm({ ...form, iva: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Stock actual"
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
            <Input
              label="Stock mínimo"
              type="number"
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
            />
            <Input
              label="Stock máximo"
              type="number"
              value={form.stock_maximo}
              onChange={(e) => setForm({ ...form, stock_maximo: e.target.value })}
            />
          </div>

          <Input
            label="Ubicación"
            value={form.ubicacion}
            onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            placeholder="Ej: Pasillo A - Estante 3"
          />

          <Input
            label="URL imagen"
            value={form.imagen_url}
            onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear producto')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}