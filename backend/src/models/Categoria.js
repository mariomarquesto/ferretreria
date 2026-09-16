import { BaseModel } from './BaseModel.js';
import { pool } from '../config/db.js';

export class Categoria extends BaseModel {
  static tableName = 'categorias';
  static fillable = ['nombre', 'descripcion', 'padre_id', 'activo'];
  static searchable = ['nombre'];

  /**
   * Lista todas las categorías activas con la cantidad de productos activos.
   */
  static async findAllWithCount() {
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.nombre,
        c.descripcion,
        c.padre_id,
        c.activo,
        c.created_at,
        COUNT(p.id)::int AS productos_count
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = TRUE
      WHERE c.activo = TRUE
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);
    return rows;
  }
}