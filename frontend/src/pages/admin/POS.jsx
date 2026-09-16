import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { formatMoney } from '../../utils/format';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const FORMAS_PAGO = [
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'debito', label: '💳 Débito' },
  { value: 'credito', label: '💳 Crédito' },
  { value: 'transferencia', label: '🏦 Transf.' },
  { value: 'cta_cte', label: '📋 Cta. Cte.' }
];

// ============================================================
// HELPERS DE FORMATO (evita que "UN" se traduzca a "Naciones Unidas")
// ============================================================

const UNIDAD_LABEL = {
  UN: 'u.',
  U: 'u.',
  UNI: 'u.',
  UNIDAD: 'u.',
  MT: 'm',
  M: 'm',
  METRO: 'm',
  KG: 'kg',
  KILO: 'kg',
  KILOGRAMO: 'kg',
  LT: 'L',
  L: 'L',
  LITRO: 'L',
  CAJA: 'caja',
  PACK: 'pack',
  M2: 'm²',
  CM: 'cm',
  MM: 'mm',
  GR: 'g',
  DOCENA: 'docena'
};

// Devuelve una etiqueta corta y clara para la unidad
function fmtUnidad(codigo) {
  if (!codigo) return '';
  const key = String(codigo).trim().toUpperCase();
  return UNIDAD_LABEL[key] || key;
}

// Formatea la cantidad según decimales permitidos
function fmtCantidad(cantidad, permiteDecimales) {
  const n = Number(cantidad);
  if (!permiteDecimales) return n.toFixed(0);
  return n.toFixed(3).replace(/\.?0+$/, '');
}

// Formato completo: "2.5 m" o "3 u."
function fmtCantidadConUnidad(cantidad, permiteDecimales, unidadCodigo) {
  return `${fmtCantidad(cantidad, permiteDecimales)} ${fmtUnidad(unidadCodigo)}`;
}

export default function POS() {
  const [buscar, setBuscar] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [carrito, setCarrito] = useState([]);

  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');

  const [formaPago, setFormaPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);

  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [ventaAbierta, setVentaAbierta] = useState(false);

  const buscarRef = useRef(null);

  useEffect(() => {
    api.get('/clientes?limit=500')
      .then(({ data }) => setClientes(data))
      .catch(() => {});
    buscarRef.current?.focus();
  }, []);

  useEffect(() => {
    if (buscar.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/productos', {
          params: { search: buscar, limit: 30 }
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

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && resultados.length >= 1) {
      agregarAlCarrito(resultados[0]);
    }
  };

  const agregarAlCarrito = (producto) => {
    setError('');
    const permiteDecimales = !!producto.permite_decimales;
    const paso = permiteDecimales ? 0.5 : 1;
    const stockNum = Number(producto.stock);

    setCarrito((prev) => {
      const existe = prev.find((it) => it.producto_id === producto.id);

      if (existe) {
        const nueva = existe.cantidad + paso;
        if (nueva > stockNum) {
          setError(
            `Sin stock suficiente de "${producto.nombre}" (disponible: ${fmtCantidadConUnidad(stockNum, permiteDecimales, producto.unidad)})`
          );
          return prev;
        }
        return prev.map((it) =>
          it.producto_id === producto.id ? { ...it, cantidad: nueva } : it
        );
      }

      if (stockNum < paso) {
        setError(`"${producto.nombre}" no tiene stock`);
        return prev;
      }

      return [
        ...prev,
        {
          producto_id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio_unitario: Number(producto.precio_venta),
          iva: Number(producto.iva || 21),
          stock: stockNum,
          unidad: producto.unidad || 'UN',
          presentacion: producto.presentacion,
          permite_decimales: permiteDecimales,
          cantidad: paso
        }
      ];
    });

    setBuscar('');
    setResultados([]);
    buscarRef.current?.focus();
  };

  const cambiarCantidad = (producto_id, valor) => {
    const n = Number(valor);
    if (isNaN(n) || n <= 0) return;
    setCarrito((prev) =>
      prev.map((it) => {
        if (it.producto_id !== producto_id) return it;
        const final = it.permite_decimales ? n : Math.floor(n);
        if (final > it.stock) {
          setError(`Stock insuficiente. Disponible: ${fmtCantidadConUnidad(it.stock, it.permite_decimales, it.unidad)}`);
          return it;
        }
        setError('');
        return { ...it, cantidad: final };
      })
    );
  };

  const incrementar = (producto_id) => {
    setCarrito((prev) =>
      prev.map((it) => {
        if (it.producto_id !== producto_id) return it;
        const paso = it.permite_decimales ? 0.5 : 1;
        const nueva = it.cantidad + paso;
        if (nueva > it.stock) {
          setError(`Stock insuficiente. Disponible: ${fmtCantidadConUnidad(it.stock, it.permite_decimales, it.unidad)}`);
          return it;
        }
        setError('');
        return { ...it, cantidad: nueva };
      })
    );
  };

  const decrementar = (producto_id) => {
    setCarrito((prev) =>
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
    setError('');
  };

  const cambiarPrecio = (producto_id, valor) => {
    const n = Number(valor);
    if (isNaN(n) || n < 0) return;
    setCarrito((prev) =>
      prev.map((it) =>
        it.producto_id === producto_id ? { ...it, precio_unitario: n } : it
      )
    );
  };

  const quitar = (producto_id) => {
    setCarrito((prev) => prev.filter((it) => it.producto_id !== producto_id));
  };

  const vaciar = () => {
    if (carrito.length === 0) return;
    if (confirm('¿Vaciar el carrito?')) {
      setCarrito([]);
      setDescuento(0);
      setClienteId('');
      setFormaPago('efectivo');
      setError('');
    }
  };

  const subtotal = carrito.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
  const ivaTotal = carrito.reduce(
    (s, it) => s + it.precio_unitario * it.cantidad * (it.iva / 100),
    0
  );
  const total = subtotal + ivaTotal - Number(descuento || 0);
  const totalItems = carrito.reduce((s, it) => s + it.cantidad, 0);

  const cobrar = async () => {
    if (carrito.length === 0) return;
    setError('');
    setCobrando(true);
    try {
      const payload = {
        cliente_id: clienteId ? Number(clienteId) : null,
        forma_pago: formaPago,
        descuento: Number(descuento) || 0,
        canal: 'pos',
        items: carrito.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario
        }))
      };
      const { data } = await api.post('/ventas', payload);
      setTicket(data);
      setCarrito([]);
      setDescuento(0);
      setClienteId('');
      setFormaPago('efectivo');
      setVentaAbierta(false);
      buscarRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta');
    } finally {
      setCobrando(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ============================================================ */}
      {/* BUSCADOR STICKY ARRIBA */}
      {/* ============================================================ */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
              🔍
            </span>
            <input
              ref={buscarRef}
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar producto por nombre, código o escanear código de barras..."
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-yellow-400 rounded-xl outline-none focus:border-yellow-500 bg-yellow-50/30 font-medium"
              autoFocus
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>💡 Escaneá un código o escribí y presioná Enter para agregar al instante</span>
            {resultados.length > 0 && (
              <span className="text-gray-400">{resultados.length} resultados</span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* GRILLA DE PRODUCTOS */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">

          {buscando && (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-sm text-gray-500">Buscando...</p>
            </div>
          )}

          {!buscando && buscar.trim().length < 2 && (
            <div className="py-20 text-center text-gray-400">
              <p className="text-7xl mb-4">🔧</p>
              <p className="text-xl font-medium text-gray-600">Empezá a buscar productos</p>
              <p className="text-sm mt-2">Escribí al menos 2 caracteres o escaneá un código de barras</p>
            </div>
          )}

          {!buscando && buscar.trim().length >= 2 && resultados.length === 0 && (
            <div className="py-20 text-center text-gray-400">
              <p className="text-6xl mb-3">😕</p>
              <p className="text-lg">Sin resultados para "{buscar}"</p>
            </div>
          )}

          {!buscando && resultados.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {resultados.map((p) => {
                const sinStock = Number(p.stock) <= 0;
                const stockBajo = Number(p.stock) <= p.stock_minimo && !sinStock;
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    disabled={sinStock}
                    className={`
                      text-left p-4 rounded-xl border-2 transition-all bg-white
                      ${sinStock
                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-yellow-400 hover:shadow-lg active:scale-95'}
                    `}
                  >
                    <p className="font-semibold text-base text-gray-800 line-clamp-2 mb-1 min-h-[2.5rem]">
                      {p.nombre}
                    </p>
                    <p className="text-xs text-gray-400 mb-2 font-mono">{p.codigo}</p>

                    {p.presentacion && p.presentacion !== 'Unidad' && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mb-2 font-medium">
                        {p.presentacion}
                      </span>
                    )}

                    <p className="text-2xl font-bold text-green-700 my-2">
                      {formatMoney(p.precio_venta)}
                    </p>

                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sinStock
                          ? 'bg-red-100 text-red-700'
                          : stockBajo
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {fmtCantidadConUnidad(p.stock, p.permite_decimales, p.unidad)}
                      </span>
                      {p.marca && (
                        <span className="text-xs text-gray-400 truncate">{p.marca}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTÓN FLOTANTE - VER VENTA ACTUAL */}
      {/* ============================================================ */}
      {carrito.length > 0 && !ventaAbierta && (
        <button
          onClick={() => setVentaAbierta(true)}
          className="fixed bottom-6 right-6 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl px-6 py-5 font-bold flex items-center gap-3 active:scale-95 transition-all"
        >
          <span className="bg-white text-green-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
            {carrito.length}
          </span>
          <span className="text-base">Ver venta</span>
          <span className="font-bold text-lg">{formatMoney(total)}</span>
        </button>
      )}

      {/* ============================================================ */}
      {/* MODAL GRANDE: DETALLE DE VENTA */}
      {/* ============================================================ */}
      <Modal
        open={ventaAbierta}
        onClose={() => setVentaAbierta(false)}
        title={`🧾 Venta actual · ${carrito.length} ${carrito.length === 1 ? 'producto' : 'productos'}`}
        size="xl"
      >
        {carrito.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-6xl mb-3">🛒</p>
            <p className="text-lg">El carrito está vacío</p>
          </div>
        ) : (
          <div className="space-y-4">

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Tabla de items */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-center px-4 py-3 w-48">Cantidad</th>
                    <th className="text-center px-4 py-3 w-32">Precio</th>
                    <th className="text-right px-4 py-3 w-32">Subtotal</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carrito.map((it) => (
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
                          <span className="text-xs text-gray-500">
                            Stock: {fmtCantidadConUnidad(it.stock, it.permite_decimales, it.unidad)}
                          </span>
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
                        <p className="text-[10px] text-gray-400">
                          {formatMoney(it.precio_unitario)} × {fmtCantidadConUnidad(it.cantidad, it.permite_decimales, it.unidad)}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => quitar(it.producto_id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 text-lg transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={vaciar}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                🗑️ Vaciar todo
              </button>
            </div>

            {/* Grid de cobro */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">Consumidor final</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de pago</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FORMAS_PAGO.map((fp) => (
                      <button
                        key={fp.value}
                        onClick={() => setFormaPago(fp.value)}
                        className={`
                          py-2.5 px-3 rounded-lg text-sm font-medium transition-all
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descuento ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400 bg-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">IVA</span>
                  <span className="font-medium">{formatMoney(ivaTotal)}</span>
                </div>
                {Number(descuento) > 0 && (
                  <div className="flex justify-between text-base text-red-600">
                    <span>Descuento</span>
                    <span className="font-medium">-{formatMoney(descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-3 border-t-2 border-gray-300">
                  <span className="font-bold text-xl">TOTAL</span>
                  <span className="font-bold text-3xl text-blue-700">{formatMoney(total)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="success"
              onClick={cobrar}
              disabled={cobrando}
              className="w-full !py-5 !text-xl !font-bold"
            >
              {cobrando ? '⏳ Procesando...' : `💵 COBRAR ${formatMoney(total)}`}
            </Button>
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* MODAL TICKET POST-VENTA */}
      {/* ============================================================ */}
      <Modal
        open={!!ticket}
        onClose={() => setTicket(null)}
        title="✅ Venta registrada"
        size="lg"
      >
        {ticket && (
          <div className="space-y-4">
            <div className="text-center py-3">
              <p className="text-6xl mb-3">🎉</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoney(ticket.total)}</p>
              <p className="text-sm text-gray-500 mt-2">
                Venta <span className="font-mono font-semibold">{ticket.numero}</span>
              </p>
            </div>

            {ticket.items?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                    {ticket.items.map((it) => (
                      <tr key={it.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <p className="font-medium">{it.producto}</p>
                          <p className="text-xs text-gray-400">
                            {it.codigo}
                            {it.presentacion && it.presentacion !== 'Unidad' && ` · ${it.presentacion}`}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtCantidadConUnidad(it.cantidad, true, it.unidad_medida)}
                        </td>
                        <td className="px-3 py-2 text-right">{formatMoney(it.precio_unitario)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatMoney(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatMoney(ticket.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA</span>
                <span>{formatMoney(ticket.iva)}</span>
              </div>
              {Number(ticket.descuento) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento</span>
                  <span>-{formatMoney(ticket.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-200 text-lg">
                <span>Total</span>
                <span className="text-blue-700">{formatMoney(ticket.total)}</span>
              </div>
              <div className="flex justify-between text-green-700 text-xs pt-1">
                <span>Ganancia</span>
                <span className="font-semibold">{formatMoney(ticket.ganancia)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setTicket(null)} className="flex-1">
                Cerrar
              </Button>
              <Button onClick={() => window.print()} className="flex-1">
                🖨️ Imprimir
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setTicket(null);
                  buscarRef.current?.focus();
                }}
                className="flex-1"
              >
                ➕ Nueva venta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}