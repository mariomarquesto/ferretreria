import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Gasto extends BaseModel {
  static tableName = 'gastos';
  static fillable = [
    'tipo_id',
    'descripcion',
    'monto',
    'fecha',
    'usuario_id',
    'comprobante_url',
    'recurrente',
    'periodo'
  ];
  static searchable = ['descripcion'];

  /**
   * Listado con join al tipo de gasto y usuario.
   * Filtra por rango de fechas y tipo.
   */
  static async listar({ desde, hasta, tipo_id, limit = 200, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (desde) { params.push(desde); cond.push(`g.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`g.fecha <= $${params.length}`); }
    if (tipo_id) { params.push(tipo_id); cond.push(`g.tipo_id = $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        g.*,
        t.nombre AS tipo,
        t.categoria,
        u.nombre AS usuario
      FROM gastos g
      LEFT JOIN tipos_gasto t ON t.id = g.tipo_id
      LEFT JOIN usuarios u ON u.id = g.usuario_id
      ${where}
      ORDER BY g.fecha DESC, g.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Detalle de un gasto.
   */
  static async findDetailed(id) {
    const { rows } = await pool.query(`
      SELECT
        g.*,
        t.nombre AS tipo,
        t.categoria,
        u.nombre AS usuario
      FROM gastos g
      LEFT JOIN tipos_gasto t ON t.id = g.tipo_id
      LEFT JOIN usuarios u ON u.id = g.usuario_id
      WHERE g.id = $1
    `, [id]);
    return rows[0] || null;
  }

  /**
   * Total de gastos agrupado por tipo en un rango.
   */
  static async totalPorTipo({ desde, hasta } = {}) {
    const cond = [];
    const params = [];

    if (desde) { params.push(desde); cond.push(`g.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`g.fecha <= $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        t.id AS tipo_id,
        t.nombre AS tipo,
        t.categoria,
        COUNT(g.id)::int AS cantidad,
        COALESCE(SUM(g.monto), 0)::numeric AS total
      FROM tipos_gasto t
      LEFT JOIN gastos g ON g.tipo_id = t.id ${where ? 'AND ' + cond.join(' AND ') : ''}
      GROUP BY t.id, t.nombre, t.categoria
      ORDER BY total DESC
    `, params);
    return rows;
  }

  /**
   * Total de gastos agrupado por mes (últimos 12 meses).
   */
  static async totalPorMes() {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') AS periodo,
        COUNT(*)::int AS cantidad,
        SUM(monto)::numeric AS total
      FROM gastos
      WHERE fecha >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      ORDER BY periodo DESC
    `);
    return rows;
  }

  /**
   * Total de gastos en un rango.
   */
  static async total({ desde, hasta } = {}) {
    const cond = [];
    const params = [];

    if (desde) { params.push(desde); cond.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`fecha <= $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(monto), 0)::numeric AS total, COUNT(*)::int AS cantidad
       FROM gastos ${where}`,
      params
    );
    return rows[0];
  }
}