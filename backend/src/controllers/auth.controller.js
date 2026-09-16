import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

// ============================================================
// HELPERS
// ============================================================

const firmar = (usuario) => jwt.sign(
  { id: usuario.id, email: usuario.email, rol: usuario.rol || 'cliente' },
  config.jwt.secret,
  { expiresIn: config.jwt.expires }
);

// ============================================================
// AUTENTICACIÓN
// ============================================================

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  const user = await Usuario.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  if (!user.activo) return res.status(403).json({ error: 'Usuario desactivado' });

  const ok = await Usuario.verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  await Usuario.updateLastLogin(user.id);

  res.json({
    token: firmar(user),
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      permisos: user.permisos
    }
  });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const user = await Usuario.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  delete user.password_hash;
  res.json(user);
});

/**
 * POST /api/auth/register
 * Registro público (crea clientes).
 */
export const register = asyncHandler(async (req, res) => {
  const { nombre, email, password, telefono, direccion } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
  }

  const existe = await Usuario.findByEmail(email);
  if (existe) return res.status(409).json({ error: 'Email ya registrado' });

  // Buscar rol "cliente"
  const roles = await Usuario.getRoles();
  const rolCliente = roles.find((r) => r.nombre === 'cliente');
  if (!rolCliente) {
    return res.status(500).json({ error: 'Rol cliente no configurado' });
  }

  const nuevo = await Usuario.createWithPassword({
    nombre, email, password, telefono, direccion, rol_id: rolCliente.id
  });

  res.status(201).json({ id: nuevo.id, email: nuevo.email });
});

// ============================================================
// GESTIÓN DE EMPLEADOS (SOLO ADMIN)
// ============================================================

/**
 * GET /api/auth/roles
 */
export const listarRoles = asyncHandler(async (req, res) => {
  res.json(await Usuario.getRoles());
});

/**
 * GET /api/auth/empleados
 */
export const listarEmpleados = asyncHandler(async (req, res) => {
  const { search, rol_id, soloActivos } = req.query;
  const empleados = await Usuario.listarConRol({
    search,
    rol_id: rol_id ? Number(rol_id) : undefined,
    soloActivos: soloActivos === 'true'
  });
  res.json(empleados);
});

/**
 * GET /api/auth/empleados/:id
 */
export const verEmpleado = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  delete usuario.password_hash;
  res.json(usuario);
});

/**
 * POST /api/auth/empleados
 */
export const crearEmpleado = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || !password || !rol_id) {
    return res.status(400).json({
      error: 'Nombre, email, password y rol son obligatorios'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  const existe = await Usuario.findByEmail(email);
  if (existe) return res.status(409).json({ error: 'Email ya registrado' });

  const nuevo = await Usuario.createWithPassword(req.body);
  delete nuevo.password_hash;

  res.status(201).json(nuevo);
});

/**
 * PUT /api/auth/empleados/:id
 */
export const actualizarEmpleado = asyncHandler(async (req, res) => {
  // No permitir cambiar la password desde acá
  delete req.body.password;
  delete req.body.password_hash;

  const actualizado = await Usuario.updatePerfil(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(actualizado);
});

/**
 * PUT /api/auth/empleados/:id/password
 */
export const cambiarPasswordEmpleado = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Password requerido' });
  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  await Usuario.cambiarPassword(req.params.id, password);
  res.json({ ok: true, message: 'Contraseña actualizada' });
});

/**
 * DELETE /api/auth/empleados/:id
 * Soft delete (desactivar). Si no tiene ventas, elimina físicamente.
 */
export const eliminarEmpleado = asyncHandler(async (req, res) => {
  // No permitir auto-eliminarse
  if (Number(req.params.id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'No podés desactivar tu propio usuario' });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Si tiene ventas, solo desactivar
  const tieneVentas = await Usuario.tieneVentas(req.params.id);

  if (tieneVentas) {
    await Usuario.desactivar(req.params.id);
    return res.json({
      ok: true,
      message: 'El empleado tiene ventas registradas. Se desactivó en lugar de eliminarlo.'
    });
  }

  // Si no tiene ventas, eliminar físicamente
  await Usuario.delete(req.params.id);
  res.json({ ok: true, message: 'Empleado eliminado' });
});

/**
 * PUT /api/auth/empleados/:id/reactivar
 */
export const reactivarEmpleado = asyncHandler(async (req, res) => {
  const usuario = await Usuario.reactivar(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
});