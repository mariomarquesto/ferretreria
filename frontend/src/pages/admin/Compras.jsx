import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { formatMoney, formatDate } from '../../utils/format';
import { fmtUnidad } from '../../utils/unidades';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';

const FORMAS_PAGO = [
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transf.' },
  { value: 'cuenta_corriente', label: '📋 Cta. Cte.' }
];

const ESTADO_COLOR = {
  recibida: 'green',
  pagada: 'blue',
  pendiente: 'yellow',
  anulada: 'red'
};

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/compras');
      setCompras(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/compras/${id}`);
      setDetalle(data);
    } catch (err) {
      alert('Error al cargar detalle');
    }
  };

  const marcarPagada = async (id) => {
    if (!confirm('¿Marcar como pagada?')) return;
    try {
      await api.post(`/compras/${id}/pagar`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const anular = async (id) => {
    if (!confirm('¿Anular esta compra? Se revertirá el stock.')) return;
    try {
      await api.post(`/compras/${id}/anular`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const filtradas = compras.filter((c) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return c.numero?.toLowerCase().includes(t) || c.proveedor?.toLowerCase().includes(t);
  });

  const columns = [
    { header: 'Número', render: (c) => (
      <span className="font-mono text-xs font-semibold">{c.numero}</span>
    )},
    { header: 'Fecha', render: (c) => (
      <span className="text-xs text-gray-600">{formatDate(c.fecha)}</span>
    )},
    { header: 'Proveedor', render: (c) => (
      <span className="font-medium">{c.proveedor || '-'}</span>
    )},
    { header: 'Items', align: 'right', render: (c) => c.items_count },
    { header: 'Total', align: 'right', render: (c) => (
      <span className="font-semibold">{formatMoney(c.total)}</span>
    )},
    { header: 'Estado', render: (c) => (
      <Badge color={ESTADO_COLOR[c.estado]}>{c.estado}</Badge>
    )},
    { header: '', align: 'right', render: (c) => (
      <div className="flex justify-end gap-2 text-xs">
        <button onClick={() => verDetalle(c.id)} className="text-blue-600 font-medium">
          Ver
        </button>
        {c.estado === 'recibida' && (
          <button onClick={() => marcarPagada(c.id)} className="text-green-600 font-medium">
            Pagar
          </button>
        )}
        {c.estado !== 'anulada' && (
          <button onClick={() => anular(c.id)} className="text-red-600 font-medium">
            Anular
          </button>
        )}
      </div>
    )}
  ];

  const totalCompras = filtradas
    .filter((c) => c.estado !== 'anulada')
    .reduce((s, c) => s + Number(c.total), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">📥 Compras</h1>
          <p className="text-gray-500 mt-1">
            {filtradas.length} compras · Total: <span className="font-semibold">{formatMoney(totalCompras)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargar}>🔄</Button>
          <Button onClick={() => setNuevaAbierta(true)}>➕ Nueva compra</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número o proveedor..." />
        </div>
        <Table columns={columns} data={filtradas} loading={loading} emptyMessage="No hay compras" />
      </Card>

      {/* Modal nueva compra */}
      <NuevaCompraModal
        open={nuevaAbierta}
        onClose={() => setNuevaAbierta(false)}
        onGuardada={() => {
          setNuevaAbierta(false);
          cargar();
        }}
      />

      {/* Modal detalle */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Compra ${detalle?.numero || ''}`} size="lg">
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Proveedor</p>
                <p className="font-medium">{detalle.proveedor || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Fecha</p>
                <p className="font-medium">{formatDate(detalle.fecha)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Forma de pago</p>
                <p className="font-medium">{detalle.forma_pago || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Estado</p>
                <Badge color={ESTADO_COLOR[detalle.estado]}>{detalle.estado}</Badge>
              </div>
            </div>

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
                      <td className="px-3 py-2 text-right">
                        {Number(it.cantidad).toFixed(2).replace(/\.?0+$/, '')} {fmtUnidad(it.unidad_medida)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(it.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatMoney(detalle.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA</span>
                <span>{formatMoney(detalle.iva)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-gray-200 text-lg">
                <span>Total</span>
                <span className="text-blue-700">{formatMoney(detalle.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// MODAL NUEVA COMPRA
// ============================================================
function NuevaCompraModal({ open, onClose, onGuardada }) {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [formaPago, setFormaPago] = useState('transferencia');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);

  const [buscar, setBuscar] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const buscarRef = useRef(null);

  // Cargar proveedores al abrir
  useEffect(() => {
    if (open) {
      api.get('/proveedores?limit=500')
        .then(({ data }) => setProveedores(data))
        .catch(() => {});
      setTimeout(() => buscarRef.current?.focus(), 100);
    }
  }, [open]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!open) {
      setProveedorId('');
      setFormaPago('transferencia');
      setObservaciones('');
      setItems([]);
      setBuscar('');
      setResultados([]);
      setError('');
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (buscar.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/productos', {
          params: { search: buscar, limit: 15 }
        });
        setResultados(data);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  const agregarItem = (producto) => {
    setError('');
    setItems((prev) => {
      const existe = prev.find((it) => it.producto_id === producto.id);
      if (existe) {
        return prev.map((it) =>
          it.producto_id === producto.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio_unitario: Number(producto.precio_compra) || 0,
          iva: Number(producto.iva || 21),
          unidad: producto.unidad || 'UN',
          presentacion: producto.presentacion,
          permite_decimales: !!producto.permite_decimales,
          cantidad: 1
        }
      ];
    });
    setBuscar('');
    setResultados([]);
    buscarRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && resultados.length >= 1) {
      agregarItem(resultados[0]);
    }
    if (e.key === 'Escape') setBuscar('');
  };

  const cambiarCantidad = (producto_id, valor) => {
    const n = Number(valor);
    if (isNaN(n) || n <= 0) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.producto_id !== producto_id) return it;
        const final = it.permite_decimales ? n : Math.floor(n);
        return { ...it, cantidad: final };
      })
    );
  };

  const cambiarPrecio = (producto_id, valor) => {
    const n = Number(valor);
    if (isNaN(n) || n < 0) return;
    setItems((prev) =>
      prev.map((it) =>
        it.producto_id === producto_id ? { ...it, precio_unitario: n } : it
      )
    );
  };

  const incrementar = (producto_id) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.producto_id !== producto_id) return it;
        const paso = it.permite_decimales ? 0.5 : 1;
        return { ...it, cantidad: it.cantidad + paso };
      })
    );
  };

  const decrementar = (producto_id) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.producto_id !== producto_id) return it;
          const paso = it.permite_decimales ? 0.5 : 1;
          const nueva = it.cantidad - paso;
          if (nueva <= 0) return { ...it, cantidad: 0 };
          return { ...it, cantidad: nueva };
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const quitar = (producto_id) => {
    setItems((prev) => prev.filter((it) => it.producto_id !== producto_id));
  };

  const subtotal = items.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
  const ivaTotal = items.reduce(
    (s, it) => s + it.precio_unitario * it.cantidad * (it.iva / 100),
    0
  );
  const total = subtotal + ivaTotal;

  const guardar = async () => {
    if (!proveedorId) {
      setError('Seleccioná un proveedor');
      return;
    }
    if (items.length === 0) {
      setError('Agregá al menos un producto');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await api.post('/compras', {
        proveedor_id: Number(proveedorId),
        forma_pago: formaPago,
        observaciones,
        estado: 'recibida',
        items: items.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario
        }))
      });
      onGuardada();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la compra');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📥 Nueva compra"
      size="xl"
    >
      <div className="space-y-4">

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Proveedor + forma de pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400 bg-white"
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forma de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAS_PAGO.map((fp) => (
                <button
                  key={fp.value}
                  onClick={() => setFormaPago(fp.value)}
                  className={`
                    py-2.5 px-2 rounded-lg text-sm font-medium transition-all
                    ${formaPago === fp.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'}
                  `}
                >
                  {fp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar productos
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
              🔍
            </span>
            <input
              ref={buscarRef}
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar por nombre, código o escanear código de barras..."
              className="w-full pl-11 pr-3 py-3 text-base border-2 border-yellow-400 rounded-xl outline-none focus:border-yellow-500 bg-yellow-50/30"
            />
          </div>

          {/* Resultados dropdown */}
          {buscando && (
            <div className="mt-2 text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!buscando && resultados.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white shadow-lg">
              {resultados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarItem(p)}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 flex items-center justify-between gap-3 hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">{p.codigo}</span>
                      <span className="text-xs text-gray-500">
                        Stock actual: {Number(p.stock).toFixed(p.permite_decimales ? 2 : 0)} {fmtUnidad(p.unidad)}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-700 shrink-0">
                    {formatMoney(p.precio_compra)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabla de items */}
        {items.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-center px-4 py-3 w-44">Cantidad</th>
                  <th className="text-center px-4 py-3 w-32">P. Compra</th>
                  <th className="text-right px-4 py-3 w-32">Subtotal</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.producto_id} className="hover:bg-yellow-50/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{it.nombre}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">{it.codigo}</span>
                        {it.presentacion && it.presentacion !== 'Unidad' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {it.presentacion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => decrementar(it.producto_id)}
                          className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg active:scale-90"
                        >
                          −
                        </button>
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={it.cantidad}
                            onChange={(e) => cambiarCantidad(it.producto_id, e.target.value)}
                            step={it.permite_decimales ? '0.5' : '1'}
                            min={it.permite_decimales ? '0.1' : '1'}
                            className="w-full text-center text-base border-2 border-gray-300 rounded-lg py-1.5 pr-9 outline-none focus:border-blue-400 font-semibold"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none">
                            {fmtUnidad(it.unidad)}
                          </span>
                        </div>
                        <button
                          onClick={() => incrementar(it.producto_id)}
                          className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.precio_unitario}
                          onChange={(e) => cambiarPrecio(it.producto_id, e.target.value)}
                          className="w-full text-right text-base border-2 border-gray-300 rounded-lg py-1.5 pl-7 pr-2 outline-none focus:border-blue-400 font-semibold"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-lg text-gray-800">
                        {formatMoney(it.precio_unitario * it.cantidad)}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => quitar(it.producto_id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 text-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400"
            placeholder="Notas de la compra..."
          />
        </div>

        {/* Totales + botón */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="text-xs text-gray-500 self-end">
            {items.length > 0 && (
              <p>{items.length} productos · {items.reduce((s, it) => s + it.cantidad, 0).toFixed(2).replace(/\.?0+$/, '')} unidades totales</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA</span>
              <span className="font-medium">{formatMoney(ivaTotal)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t-2 border-gray-300">
              <span className="font-bold text-lg">TOTAL</span>
              <span className="font-bold text-2xl text-blue-700">{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="sm:flex-1">
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={guardar}
            disabled={guardando || items.length === 0 || !proveedorId}
            className="sm:flex-[2] !py-3 !text-base !font-bold"
          >
            {guardando ? '⏳ Guardando...' : `📥 Registrar compra · ${formatMoney(total)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}