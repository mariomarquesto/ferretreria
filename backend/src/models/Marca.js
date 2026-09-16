import { BaseModel } from './BaseModel.js';
import { pool } from '../config/db.js';

export class Marca extends BaseModel {
  static tableName = 'marcas';
  static fillable = ['nombre', 'activo'];
  static searchable = ['nombre'];

  /**
   * Lista con la cantidad de productos activos por marca.
   */
  static async findAllWithCount() {
    const { rows } = await pool.query(`
      SELECT
        m.id,
        m.nombre,
        m.activo,
        COUNT(p.id)::int AS productos_count
      FROM marcas m
      LEFT JOIN productos p ON p.marca_id = m.id AND p.activo = TRUE
      WHERE m.activo = TRUE
      GROUP BY m.id
      ORDER BY m.nombre ASC
    `);
    return rows;
  }
}