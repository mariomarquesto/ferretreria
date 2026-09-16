import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Usuario extends BaseModel {
  static tableName = 'usuarios';
  static fillable = ['nombre', 'email', 'password_hash', 'rol_id', 'telefono', 'direccion', 'activo'];
  static searchable = ['nombre', 'email'];

  static async findByEmail(email) {
    const { rows } = await pool.query(`
      SELECT u.*, r.nombre AS rol, r.permisos
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.rol_id
      WHERE u.email = $1
    `, [email]);
    return rows[0] || null;
  }

  static async createWithPassword({ nombre, email, password, rol_id, telefono, direccion }) {
    const password_hash = await bcrypt.hash(password, 10);
    return this.create({ nombre, email, password_hash, rol_id, telefono, direccion });
  }

  static async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }

  static async updateLastLogin(id) {
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [id]);
  }
}