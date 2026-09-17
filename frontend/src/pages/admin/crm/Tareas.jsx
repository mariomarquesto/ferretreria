import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { formatDateTime } from '../../../utils/format';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const PRIORIDAD_COLOR = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  baja: 'bg-gray-100 text-gray-600 border-gray-200'
};

const PRIORIDAD_LABEL = {
  urgente: '🚨 Urgente',
  alta: '🔴 Alta',
  media: '🟡 Media',
  baja: '⚪ Baja'
};

const ESTADO_LABEL = {
  pendiente: '⏳ Pendiente',
  completada: '✅ Completada',
  vencida: '⚠️ Vencida',
  cancelada: '❌ Cancelada'
};

const emptyForm = {
  cliente_id: '',
  titulo: '',
  descripcion: '',
  fecha_programada: '',
  prioridad: 'media'
};

export default function CRMTareas() {
  const [tareas, setTareas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargarClientes = async () => {
    try {
      const { data } = await api.get('/marketing/clientes?limit=500');
      setClientes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      const { data } = await api.get('/marketing/tareas', { params });
      setTareas(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    cargar();
  }, [filtroEstado, filtroPrioridad]);

  const abrirNueva = () => {
    setForm(emptyForm);
    setErrorForm('');
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm('');
    setGuardando(true);

    try {
      if (!form.titulo.trim()) {
        throw new Error('El título es obligatorio');
      }

      const payload = {
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        fecha_programada: form.fecha_programada || null,
        prioridad: form.prioridad
      };

      await api.post('/marketing/tareas', payload);
      setModalOpen(false);
      cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.error || err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const completar = async (id) => {
    if (!confirm('¿Marcar esta tarea como completada?')) return;
    try {
      await api.put(`/marketing/tareas/${id}/completar`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.delete(`/marketing/tareas/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  // Verificar si una tarea está vencida
  const esVencida = (t) => {
    return t.estado === 'pendiente' && t.fecha_programada && new Date(t.fecha_programada) < new Date();
  };

  const pendientes = tareas.filter((t) => t.estado === 'pendiente' && !esVencida(t)).length;
  const vencidas = tareas.filter((t) => esVencida(t)).length;
  const completadas = tareas.filter((t) => t.estado === 'completada').length;

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            📋 Tareas y Recordatorios
          </h1>
          <p className="text-gray-500 mt-1">
            {pendientes} pendientes · {vencidas} vencidas · {completadas} completadas
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/crm"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
          >
            ← Dashboard
          </Link>
          <Button onClick={abrirNueva}>➕ Nueva tarea</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroEstado('pendiente')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filtroEstado === 'pendiente' ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ⏳ Pendientes
        </button>
        <button
          onClick={() => setFiltroEstado('completada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filtroEstado === 'completada' ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ✅ Completadas
        </button>
        <button
          onClick={() => setFiltroEstado('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            !filtroEstado ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todas
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las prioridades</option>
          <option value="urgente">🚨 Urgente</option>
          <option value="alta">🔴 Alta</option>
          <option value="media">🟡 Media</option>
          <option value="baja">⚪ Baja</option>
        </select>
      </div>

      {/* Lista de tareas */}
      <Card>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">❌ {error}</div>
        ) : tareas.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-sm">No hay tareas con estos filtros</p>
            <button
              onClick={abrirNueva}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Crear la primera tarea →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tareas.map((t) => {
              const vencida = esVencida(t);
              return (
                <div
                  key={t.id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-lg border-2 transition ${
                    t.estado === 'completada'
                      ? 'bg-gray-50 border-gray-200 opacity-70'
                      : vencida
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Checkbox completar */}
                  <button
                    onClick={() => t.estado === 'pendiente' && completar(t.id)}
                    disabled={t.estado === 'completada'}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                      t.estado === 'completada'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {t.estado === 'completada' && '✓'}
                  </button>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <p className={`font-medium text-sm ${t.estado === 'completada' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {t.titulo}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORIDAD_COLOR[t.prioridad]}`}>
                        {PRIORIDAD_LABEL[t.prioridad]}
                      </span>
                      {vencida && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 font-medium">
                          ⚠️ Vencida
                        </span>
                      )}
                    </div>

                    {t.descripcion && (
                      <p className="text-xs text-gray-600 mb-2">{t.descripcion}</p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      {t.cliente_nombre && (
                        <Link
                          to={`/admin/crm/clientes/${t.cliente_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          👤 {t.cliente_nombre}
                        </Link>
                      )}
                      {t.fecha_programada && (
                        <span className={vencida ? 'text-red-600 font-medium' : ''}>
                          📅 {formatDateTime(t.fecha_programada)}
                        </span>
                      )}
                      {t.usuario_nombre && (
                        <span>✍️ {t.usuario_nombre}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {t.estado === 'pendiente' && (
                      <button
                        onClick={() => completar(t.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium whitespace-nowrap"
                      >
                        ✅ Completar
                      </button>
                    )}
                    <button
                      onClick={() => eliminar(t.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal crear tarea */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="📋 Nueva tarea"
        size="md"
      >
        <form onSubmit={guardar} className="space-y-4">
          {errorForm && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errorForm}
            </div>
          )}

          <Input
            label="Título *"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej: Llamar para ofrecer promoción"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detalles de la tarea..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente (opcional)
            </label>
            <select
              value={form.cliente_id}
              onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin cliente asociado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="baja">⚪ Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🔴 Alta</option>
                <option value="urgente">🚨 Urgente</option>
              </select>
            </div>

            <Input
              label="Fecha programada"
              type="datetime-local"
              value={form.fecha_programada}
              onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}