import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { formatMoney, formatDate, formatDateTime } from '../../../utils/format';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const SEGMENTO_ACTIVIDAD = {
  nuevo:    { label: '🆕 Nuevo',    color: 'bg-blue-100 text-blue-700' },
  activo:   { label: '✅ Activo',    color: 'bg-green-100 text-green-700' },
  tibio:    { label: '🌤️ Tibio',    color: 'bg-yellow-100 text-yellow-700' },
  frio:     { label: '❄️ Frío',     color: 'bg-orange-100 text-orange-700' },
  inactivo: { label: '💤 Inactivo', color: 'bg-red-100 text-red-700' }
};

const SEGMENTO_VALOR = {
  vip:        { label: '👑 VIP',         color: 'bg-purple-100 text-purple-700' },
  frecuente:  { label: '⭐ Frecuente',   color: 'bg-indigo-100 text-indigo-700' },
  ocasional:  { label: '🔹 Ocasional',  color: 'bg-blue-100 text-blue-700' },
  esporadico: { label: '🔸 Esporádico', color: 'bg-gray-100 text-gray-600' }
};

const TIPOS_CLIENTE = [
  { value: 'minorista', label: 'Minorista' },
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'profesional', label: 'Profesional' }
];

export default function FichaCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notaModal, setNotaModal] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/marketing/clientes/${id}`);
      setCliente(data);
      setForm({
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        cuit_dni: data.cuit_dni || '',
        tipo_cliente: data.tipo_cliente || 'minorista',
        canal_preferido: data.canal_preferido || 'whatsapp',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        fecha_nacimiento: data.fecha_nacimiento
          ? new Date(data.fecha_nacimiento).toISOString().slice(0, 10)
          : ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [id]);

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await api.put(`/marketing/clientes/${id}`, form);
      setEditando(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return;
    try {
      await api.post(`/marketing/clientes/${id}/notas`, { nota: nuevaNota });
      setNuevaNota('');
      setNotaModal(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar la nota');
    }
  };

  // Formatear teléfono para WhatsApp (sin caracteres raros)
  const formatearParaWhatsApp = (tel) => {
    if (!tel) return null;
    let limpio = String(tel).replace(/\D/g, '');
    if (limpio.startsWith('0')) limpio = limpio.slice(1);
    limpio = limpio.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    return `54${limpio}`;
  };

  const abrirWhatsApp = (mensaje = '') => {
    const numero = formatearParaWhatsApp(cliente.telefono);
    if (!numero) {
      alert('El cliente no tiene teléfono cargado');
      return;
    }
    const url = `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
    window.open(url, '_blank');
  };

  const enviarEmail = () => {
    if (!cliente.email) {
      alert('El cliente no tiene email cargado');
      return;
    }
    window.open(`mailto:${cliente.email}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          ❌ {error || 'Cliente no encontrado'}
        </div>
        <Link
          to="/admin/crm/clientes"
          className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          ← Volver a la lista
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/crm/clientes')}
            className="w-10 h-10 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
              {cliente.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENTO_ACTIVIDAD[cliente.segmento_actividad]?.color}`}>
                {SEGMENTO_ACTIVIDAD[cliente.segmento_actividad]?.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENTO_VALOR[cliente.segmento_valor]?.color}`}>
                {SEGMENTO_VALOR[cliente.segmento_valor]?.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                {cliente.tipo_cliente || 'minorista'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setNotaModal(true)}>
            📝 Nota
          </Button>
          {cliente.telefono && (
            <button
              onClick={() => abrirWhatsApp(`Hola ${cliente.nombre}! 👋`)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              📱 WhatsApp
            </button>
          )}
          {cliente.email && (
            <button
              onClick={enviarEmail}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              ✉️ Email
            </button>
          )}
        </div>
      </div>

      {/* KPIs del cliente */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiBox
          label="Total comprado"
          valor={formatMoney(cliente.stats.total_comprado)}
          color="from-green-500 to-green-600"
          icono="💰"
        />
        <KpiBox
          label="Compras"
          valor={cliente.stats.total_compras}
          color="from-blue-500 to-blue-600"
          icono="🛒"
        />
        <KpiBox
          label="Ticket promedio"
          valor={formatMoney(cliente.stats.ticket_promedio)}
          color="from-purple-500 to-purple-600"
          icono="🧾"
        />
        <KpiBox
          label="Última compra"
          valor={cliente.stats.ultima_compra ? formatDate(cliente.stats.ultima_compra) : 'Nunca'}
          color="from-slate-500 to-slate-600"
          icono="📅"
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: datos + notas */}
        <div className="lg:col-span-1 space-y-4">

          {/* Datos del cliente */}
          <Card
            title="👤 Datos del cliente"
            action={
              <button
                onClick={() => setEditando(!editando)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {editando ? 'Cancelar' : '✏️ Editar'}
              </button>
            }
          >
            {editando ? (
              <div className="space-y-3">
                <Input
                  label="Nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Teléfono"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
                <Input
                  label="CUIT/DNI"
                  value={form.cuit_dni}
                  onChange={(e) => setForm({ ...form, cuit_dni: e.target.value })}
                />
                <Input
                  label="Dirección"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de cliente
                  </label>
                  <select
                    value={form.tipo_cliente}
                    onChange={(e) => setForm({ ...form, tipo_cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_CLIENTE.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Instagram"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="@usuario"
                />
                <Input
                  label="Facebook"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="/pagina"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditando(false)}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={guardarCambios} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <DatoFila icono="✉️" label="Email" valor={cliente.email} />
                <DatoFila icono="📞" label="Teléfono" valor={cliente.telefono} />
                <DatoFila icono="🆔" label="CUIT/DNI" valor={cliente.cuit_dni} />
                <DatoFila icono="🏠" label="Dirección" valor={cliente.direccion} />
                <DatoFila icono="📸" label="Instagram" valor={cliente.instagram} />
                <DatoFila icono="👍" label="Facebook" valor={cliente.facebook} />
                {cliente.fecha_nacimiento && (
                  <DatoFila
                    icono="🎂"
                    label="Cumpleaños"
                    valor={formatDate(cliente.fecha_nacimiento)}
                  />
                )}
                <DatoFila
                  icono="👤"
                  label="Cliente desde"
                  valor={formatDate(cliente.created_at)}
                />
                {Number(cliente.saldo) > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-700 font-medium">Saldo pendiente</p>
                    <p className="text-lg font-bold text-red-700">
                      {formatMoney(cliente.saldo)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Notas */}
          <Card
            title="📝 Notas internas"
            action={
              <button
                onClick={() => setNotaModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                ➕ Agregar
              </button>
            }
          >
            {cliente.notas ? (
              <div className="text-sm text-gray-700 whitespace-pre-line max-h-64 overflow-y-auto">
                {cliente.notas}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Sin notas todavía
              </p>
            )}
          </Card>

        </div>

        {/* Columna derecha: historial + tareas */}
        <div className="lg:col-span-2 space-y-4">

          {/* Historial de ventas */}
          <Card
            title={`🛒 Historial de compras (${cliente.stats.total_compras})`}
            action={
              <Link
                to={`/admin/ventas?cliente_id=${id}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas →
              </Link>
            }
          >
            {cliente.ventas.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <p className="text-4xl mb-2">🛒</p>
                <p className="text-sm">Este cliente todavía no tiene compras</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cliente.ventas.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-gray-500">{v.numero}</p>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(v.fecha)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-gray-800">{formatMoney(v.total)}</p>
                      <p className="text-xs text-gray-500 capitalize">{v.forma_pago}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Productos más comprados */}
          <Card title="🏆 Productos más comprados">
            {cliente.productosFrecuentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Sin productos registrados
              </p>
            ) : (
              <div className="space-y-2">
                {cliente.productosFrecuentes.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        i === 0 ? 'bg-yellow-400 text-yellow-900' :
                        i === 1 ? 'bg-gray-300 text-gray-700' :
                        i === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.codigo}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-gray-800">{p.unidades} u.</p>
                      <p className="text-xs text-gray-500">{formatMoney(p.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tareas del cliente */}
          <Card
            title={`📋 Tareas (${cliente.tareas.length})`}
            action={
              <Link
                to="/admin/crm/tareas"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas →
              </Link>
            }
          >
            {cliente.tareas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Sin tareas asociadas
              </p>
            ) : (
              <div className="space-y-2">
                {cliente.tareas.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      t.estado === 'completada' ? 'bg-gray-50 border-gray-300 opacity-60' :
                      t.estado === 'vencida' ? 'bg-red-50 border-red-400' :
                      'bg-yellow-50 border-yellow-400'
                    }`}
                  >
                    <p className={`text-sm font-medium ${t.estado === 'completada' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {t.titulo}
                    </p>
                    {t.fecha_programada && (
                      <p className="text-xs text-gray-500 mt-1">
                        📅 {formatDateTime(t.fecha_programada)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Comunicaciones */}
          <Card title={`💬 Últimas comunicaciones (${cliente.comunicaciones.length})`}>
            {cliente.comunicaciones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Sin comunicaciones registradas
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {cliente.comunicaciones.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg ${
                      c.direccion === 'recibido'
                        ? 'bg-blue-50 border-l-4 border-blue-400'
                        : 'bg-green-50 border-l-4 border-green-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {c.direccion === 'recibido' ? '📥 Recibido' : '📤 Enviado'}
                        {' · '}
                        {c.canal}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(c.created_at)}
                      </span>
                    </div>
                    {c.mensaje && (
                      <p className="text-sm text-gray-700 line-clamp-3">{c.mensaje}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* Modal nueva nota */}
      <Modal
        open={notaModal}
        onClose={() => setNotaModal(false)}
        title="📝 Nueva nota interna"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota
            </label>
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Prefiere que le avisen por WhatsApp los sábados..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setNotaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={agregarNota}>Guardar nota</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function KpiBox({ label, valor, color, icono }) {
  return (
    <div className={`bg-linear-to-br ${color} text-white p-4 rounded-xl shadow`}>
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs opacity-90">{label}</p>
        <span className="text-lg">{icono}</span>
      </div>
      <p className="text-lg lg:text-xl font-bold">{valor}</p>
    </div>
  );
}

function DatoFila({ icono, label, valor }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-base shrink-0">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-800 wrap-break-word">
          {valor || <span className="text-gray-400">-</span>}
        </p>
      </div>
    </div>
  );
}