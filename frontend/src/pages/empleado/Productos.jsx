import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatMoney } from '../../utils/format';
import { fmtUnidad } from '../../utils/unidades';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/ui/SearchInput';

export default function EmpleadoProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    api.get('/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
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
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [search, filtroCategoria]);

  const columns = [
    {
      header: 'Código',
      render: (p) => (
        <span className="font-mono text-xs">{p.codigo}</span>
      )
    },
    {
      header: 'Producto',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-800">{p.nombre}</p>
          <p className="text-xs text-gray-400">{p.categoria}</p>
        </div>
      )
    },
    {
      header: 'Marca',
      render: (p) => (
        <span className="text-gray-600 text-xs">{p.marca || '-'}</span>
      )
    },
    {
      header: 'Presentación',
      render: (p) => (
        <span className="text-xs text-gray-500">
          {p.presentacion || 'Unidad'}
        </span>
      )
    },
    {
      header: 'Precio',
      align: 'right',
      render: (p) => (
        <span className="font-semibold text-gray-800">
          {formatMoney(p.precio_venta)}
        </span>
      )
    },
    {
      header: 'Stock',
      align: 'right',
      render: (p) => {
        const stockNum = Number(p.stock);
        const minimoNum = Number(p.stock_minimo);
        const sinStock = stockNum <= 0;
        const bajo = stockNum <= minimoNum && !sinStock;

        return (
          <Badge color={sinStock ? 'red' : bajo ? 'yellow' : 'green'}>
            {fmtUnidad(p.stock, p.permite_decimales, p.unidad)}
          </Badge>
        );
      }
    },
    {
      header: 'Ubicación',
      render: (p) => (
        <span className="text-xs text-gray-500">{p.ubicacion || '-'}</span>
      )
    }
  ];

  const totalProductos = productos.length;
  const sinStock = productos.filter((p) => Number(p.stock) <= 0).length;

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          📦 Consultar Stock
        </h1>
        <p className="text-gray-500 mt-1">
          {totalProductos} productos disponibles
          {sinStock > 0 && (
            <span className="text-red-600 ml-2">
              · {sinStock} sin stock
            </span>
          )}
        </p>
      </div>

      {/* Filtros */}
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

        <Table
          columns={columns}
          data={productos}
          loading={loading}
          emptyMessage="No hay productos"
        />
      </Card>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 Modo consulta</p>
        <p className="text-xs">
          Desde acá podés ver stock, precios y ubicación de los productos. Para modificar o
          ajustar stock, contactá al administrador.
        </p>
      </div>
    </div>
  );
}