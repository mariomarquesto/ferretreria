import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Usuario extends BaseModel {
  static tableName = 'usuarios';
  static fillable = [
    'nombre', 'email', 'password_hash', 'rol_id',
    'telefono', 'direccion', 'activo',
    'dni', 'fecha_ingreso', 'observaciones'
  ];
  static searchable = ['nombre', 'email', 'dni'];

  // ============================================================
  // AUTENTICACIÓN
  // ============================================================

  static async findByEmail(email) {
    const { rows } = await pool.query(`
      SELECT u.*, r.nombre AS rol, r.permisos
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.rol_id
      WHERE u.email = $1
    `, [email]);
    return rows[0] || null;
  }

  static async createWithPassword(data) {
    const {
      nombre, email, password, rol_id,
      telefono, direccion, dni, fecha_ingreso, observaciones
    } = data;

    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const password_hash = await bcrypt.hash(password, 10);

    return this.create({
      nombre,
      email,
      password_hash,
      rol_id,
      telefono,
      direccion,
      dni,
      fecha_ingreso: fecha_ingreso || null,
      observaciones,
      activo: true
    });
  }

  static async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }

  static async updateLastLogin(id) {
    await pool.query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [id]
    );
  }

  // ============================================================
  // GESTIÓN DE EMPLEADOS
  // ============================================================

  /**
   * Lista usuarios con datos del rol, con filtros.
   */
  static async listarConRol({ search, rol_id, soloActivos = false } = {}) {
    const cond = [];
    const params = [];

    if (soloActivos) cond.push('u.activo = TRUE');
    if (rol_id) {
      params.push(rol_id);
      cond.push(`u.rol_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      cond.push(`(u.nombre ILIKE $${params.length}
                 OR u.email ILIKE $${params.length}
                 OR u.dni ILIKE $${params.length})`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        u.id, u.nombre, u.email, u.telefono, u.direccion,
        u.dni, u.fecha_ingreso, u.observaciones,
        u.activo, u.ultimo_login, u.created_at,
        u.rol_id, r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.rol_id
      ${where}
      ORDER BY u.activo DESC, u.nombre ASC
    `, params);
    return rows;
  }

  static async updatePerfil(id, data) {
    const fields = [
      'nombre', 'email', 'rol_id', 'telefono',
      'direccion', 'dni', 'fecha_ingreso', 'observaciones', 'activo'
    ].filter((f) => data[f] !== undefined);

    if (fields.length === 0) throw new Error('Nada que actualizar');

    const sets = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = [...fields.map((f) => data[f]), id];

    const sql = `
      UPDATE usuarios SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, nombre, email, rol_id, telefono, direccion, activo
    `;
    const { rows } = await pool.query(sql, values);
    return rows[0] || null;
  }

  static async cambiarPassword(id, nuevaPassword) {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    const password_hash = await bcrypt.hash(nuevaPassword, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [password_hash, id]
    );
    return { ok: true };
  }

  static async desactivar(id) {
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = FALSE WHERE id = $1 RETURNING id, nombre, activo',
      [id]
    );
    return rows[0] || null;
  }

  static async reactivar(id) {
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = TRUE WHERE id = $1 RETURNING id, nombre, activo',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * ⭐ ESTE ES EL MÉTODO QUE FALTA
   */
  static async getRoles() {
    const { rows } = await pool.query(
      'SELECT id, nombre, permisos FROM roles ORDER BY id'
    );
    return rows;
  }

  static async tieneVentas(id) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM ventas WHERE usuario_id = $1',
      [id]
    );
    return rows[0].total > 0;
  }
}