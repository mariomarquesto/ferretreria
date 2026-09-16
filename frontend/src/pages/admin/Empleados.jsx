import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';

const ROLES_LABEL = {
  admin: '🔑 Administrador',
  vendedor: '💼 Vendedor',
  almacen: '📦 Almacén'
};

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rol_id: '',
  telefono: '',
  direccion: '',
  dni: '',
  fecha_ingreso: '',
  observaciones: ''
};

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroActivos, setFiltroActivos] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [passwordModal, setPasswordModal] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');

  const cargarRoles = async () => {
    try {
      const { data } = await api.get('/auth/roles');
      setRoles(data.filter((r) => r.nombre !== 'cliente'));
    } catch (err) {
      console.error(err);
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filtroRol) params.rol_id = filtroRol;
      if (filtroActivos) params.soloActivos = 'true';
      const { data } = await api.get('/auth/empleados', { params });
      setEmpleados(data.filter((e) => e.rol !== 'cliente'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRoles();
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [search, filtroRol, filtroActivos]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setErrorForm('');
    setModalOpen(true);
  };

  const abrirEditar = (emp) => {
    setEditando(emp);
    setForm({
      nombre: emp.nombre || '',
      email: emp.email || '',
      password: '',
      rol_id: emp.rol_id || '',
      telefono: emp.telefono || '',
      direccion: emp.direccion || '',
      dni: emp.dni || '',
      fecha_ingreso: emp.fecha_ingreso
        ? new Date(emp.fecha_ingreso).toISOString().slice(0, 10)
        : '',
      observaciones: emp.observaciones || ''
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
        nombre: form.nombre,
        email: form.email,
        rol_id: Number(form.rol_id),
        telefono: form.telefono,
        direccion: form.direccion,
        dni: form.dni,
        fecha_ingreso: form.fecha_ingreso || null,
        observaciones: form.observaciones
      };

      if (editando) {
        await api.put(`/auth/empleados/${editando.id}`, payload);
      } else {
        if (!form.password || form.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await api.post('/auth/empleados', { ...payload, password: form.password });
      }

      setModalOpen(false);
      cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.error || err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await api.put(`/auth/empleados/${passwordModal.id}/password`, {
        password: nuevaPassword
      });
      alert('Contraseña actualizada');
      setPasswordModal(null);
      setNuevaPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar contraseña');
    }
  };

  const eliminar = async (emp) => {
    const accion = emp.activo ? 'desactivar' : 'eliminar';
    if (!confirm(`¿Estás seguro de ${accion} a ${emp.nombre}?`)) return;

    try {
      const { data } = await api.delete(`/auth/empleados/${emp.id}`);
      alert(data.message || 'Operación exitosa');
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const reactivar = async (emp) => {
    if (!confirm(`¿Reactivar a ${emp.nombre}?`)) return;
    try {
      await api.put(`/auth/empleados/${emp.id}/reactivar`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const columns = [
    {
      header: 'Empleado',
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
            {e.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate">{e.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{e.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Rol',
      render: (e) => (
        <Badge color={
          e.rol === 'admin' ? 'red' :
          e.rol === 'vendedor' ? 'blue' :
          'purple'
        }>
          {ROLES_LABEL[e.rol] || e.rol}
        </Badge>
      )
    },
    {
      header: 'DNI',
      render: (e) => (
        <span className="text-xs font-mono">{e.dni || '-'}</span>
      )
    },
    {
      header: 'Teléfono',
      render: (e) => (
        <span className="text-xs text-gray-600">{e.telefono || '-'}</span>
      )
    },
    {
      header: 'Ingreso',
      render: (e) => (
        <span className="text-xs text-gray-500">
          {e.fecha_ingreso ? formatDate(e.fecha_ingreso) : '-'}
        </span>
      )
    },
    {
      header: 'Último acceso',
      render: (e) => (
        <span className="text-xs text-gray-500">
          {e.ultimo_login
            ? new Date(e.ultimo_login).toLocaleDateString('es-AR')
            : 'Nunca'}
        </span>
      )
    },
    {
      header: 'Estado',
      render: (e) => (
        <Badge color={e.activo ? 'green' : 'gray'}>
          {e.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      header: '',
      align: 'right',
      render: (e) => (
        <div className="flex justify-end gap-1 flex-wrap">
          {e.activo ? (
            <>
              <button
                onClick={() => abrirEditar(e)}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                Editar
              </button>
              <button
                onClick={() => setPasswordModal(e)}
                className="text-purple-600 hover:text-purple-800 text-xs font-medium"
              >
                Clave
              </button>
              <button
                onClick={() => eliminar(e)}
                className="text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Desactivar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => reactivar(e)}
                className="text-green-600 hover:text-green-800 text-xs font-medium"
              >
                Reactivar
              </button>
              <button
                onClick={() => eliminar(e)}
                className="text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const totalActivos = empleados.filter((e) => e.activo).length;
  const totalInactivos = empleados.filter((e) => !e.activo).length;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">👥 Empleados</h1>
          <p className="text-gray-500 mt-1">
            {totalActivos} activos · {totalInactivos} inactivos
          </p>
        </div>
        <Button onClick={abrirNuevo}>➕ Nuevo empleado</Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, email o DNI..."
            />
          </div>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{ROLES_LABEL[r.nombre] || r.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filtroActivos}
              onChange={(e) => setFiltroActivos(e.target.checked)}
              className="rounded"
            />
            Solo activos
          </label>
        </div>

        <Table
          columns={columns}
          data={empleados}
          loading={loading}
          emptyMessage="No hay empleados registrados"
        />
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? `Editar: ${editando.nombre}` : 'Nuevo empleado'}
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          {errorForm && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errorForm}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre completo *"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <Input
              label="DNI"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          {!editando && (
            <Input
              label="Contraseña * (mínimo 6 caracteres)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                value={form.rol_id}
                onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar rol...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {ROLES_LABEL[r.nombre] || r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Fecha de ingreso"
              type="date"
              value={form.fecha_ingreso}
              onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
            />
          </div>

          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas internas sobre el empleado..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear empleado'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal cambiar password */}
      <Modal
        open={!!passwordModal}
        onClose={() => {
          setPasswordModal(null);
          setNuevaPassword('');
        }}
        title={`Cambiar contraseña a ${passwordModal?.nombre || ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nueva contraseña (mínimo 6 caracteres)"
            type="password"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setPasswordModal(null);
                setNuevaPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={cambiarPassword}>Cambiar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}