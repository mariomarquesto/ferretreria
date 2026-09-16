import { BaseModel } from './BaseModel.js';
import { pool } from '../config/db.js';

export class MovimientoStock extends BaseModel {
  static tableName = 'movimientos_stock';
  static fillable = [
    'producto_id', 'tipo', 'motivo', 'referencia_id', 'referencia_tipo',
    'cantidad', 'stock_anterior', 'stock_posterior', 'costo_unitario', 'usuario_id'
  ];

  /**
   * Kardex completo de un producto (movimientos ordenados por fecha DESC).
   */
  static async kardexDeProducto(producto_id, { limit = 100 } = {}) {
    const { rows } = await pool.query(`
      SELECT
        m.*,
        u.nombre AS usuario,
        p.nombre AS producto,
        p.codigo
      FROM movimientos_stock m
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN productos p ON p.id = m.producto_id
      WHERE m.producto_id = $1
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT $2
    `, [producto_id, limit]);
    return rows;
  }

  /**
   * Listado general de movimientos con filtros.
   */
  static async listar({ producto_id, tipo, motivo, desde, hasta, limit = 200, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (producto_id) { params.push(producto_id); cond.push(`m.producto_id = $${params.length}`); }
    if (tipo) { params.push(tipo); cond.push(`m.tipo = $${params.length}`); }
    if (motivo) { params.push(motivo); cond.push(`m.motivo = $${params.length}`); }
    if (desde) { params.push(desde); cond.push(`m.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`m.fecha <= $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.codigo,
        p.nombre AS producto,
        u.nombre AS usuario
      FROM movimientos_stock m
      LEFT JOIN productos p ON p.id = m.producto_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      ${where}
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Resumen de movimientos por tipo en un rango.
   */
  static async resumen({ desde, hasta } = {}) {
    const cond = [];
    const params = [];
    if (desde) { params.push(desde); cond.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`fecha <= $${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        tipo,
        COUNT(*)::int AS cantidad,
        SUM(cantidad)::int AS cantidad_total
      FROM movimientos_stock
      ${where}
      GROUP BY tipo
      ORDER BY tipo
    `, params);
    return rows;
  }
}