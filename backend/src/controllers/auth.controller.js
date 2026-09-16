import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const firmar = (usuario) => jwt.sign(
  { id: usuario.id, email: usuario.email, rol: usuario.rol || 'cliente' },
  config.jwt.secret,
  { expiresIn: config.jwt.expires }
);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  const user = await Usuario.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

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

export const me = asyncHandler(async (req, res) => {
  const user = await Usuario.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  delete user.password_hash;
  res.json(user);
});

export const register = asyncHandler(async (req, res) => {
  const { nombre, email, password, telefono, direccion } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
  }

  const existe = await Usuario.findByEmail(email);
  if (existe) return res.status(409).json({ error: 'Email ya registrado' });

  const nuevo = await Usuario.createWithPassword({
    nombre, email, password, telefono, direccion, rol_id: 4
  });

  res.status(201).json({ id: nuevo.id, email: nuevo.email });
});