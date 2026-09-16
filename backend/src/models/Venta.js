import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Venta extends BaseModel {
  static tableName = 'ventas';
  static fillable = [
    'numero', 'cliente_id', 'usuario_id', 'caja_id', 'subtotal', 'descuento',
    'iva', 'total', 'costo_total', 'forma_pago', 'estado', 'canal', 'observaciones'
  ];

  /**
   * Listado con joins de cliente y vendedor.
   */
  static async listar({ desde, hasta, cliente_id, usuario_id, estado, limit = 50, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }
    if (cliente_id) { params.push(cliente_id); cond.push(`v.cliente_id = $${params.length}`); }
    if (usuario_id) { params.push(usuario_id); cond.push(`v.usuario_id = $${params.length}`); }
    if (estado) { params.push(estado); cond.push(`v.estado = $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        v.*,
        c.nombre AS cliente,
        u.nombre AS vendedor,
        COUNT(dv.id)::int AS items_count
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN detalle_venta dv ON dv.venta_id = v.id
      ${where}
      GROUP BY v.id, c.nombre, u.nombre
      ORDER BY v.fecha DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Detalle completo con items.
   */
  static async findDetailed(id) {
    const { rows: [venta] } = await pool.query(`
      SELECT
        v.*,
        c.nombre AS cliente,
        c.cuit_dni AS cliente_cuit,
        c.email AS cliente_email,
        u.nombre AS vendedor
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.id = $1
    `, [id]);

    if (!venta) return null;

    const { rows: items } = await pool.query(`
      SELECT
        dv.*,
        p.codigo,
        p.nombre AS producto
      FROM detalle_venta dv
      JOIN productos p ON p.id = dv.producto_id
      WHERE dv.venta_id = $1
      ORDER BY dv.id
    `, [id]);

    return { ...venta, items };
  }

  /**
   * Resumen por forma de pago en un rango.
   */
  static async resumenPorFormaPago({ desde, hasta } = {}) {
    const cond = ["v.estado = 'completada'"];
    const params = [];
    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT
        v.forma_pago,
        COUNT(*)::int AS cantidad,
        COALESCE(SUM(v.total), 0)::numeric AS total
      FROM ventas v
      WHERE ${cond.join(' AND ')}
      GROUP BY v.forma_pago
      ORDER BY total DESC
    `, params);
    return rows;
  }

  /**
   * Ventas por vendedor.
   */
  static async resumenPorVendedor({ desde, hasta } = {}) {
    const cond = ["v.estado = 'completada'"];
    const params = [];
    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT
        u.id AS usuario_id,
        u.nombre AS vendedor,
        COUNT(v.id)::int AS cantidad_ventas,
        COALESCE(SUM(v.total), 0)::numeric AS total_vendido,
        COALESCE(SUM(v.ganancia), 0)::numeric AS ganancia_total
      FROM usuarios u
      LEFT JOIN ventas v ON v.usuario_id = u.id AND ${cond.join(' AND ')}
      GROUP BY u.id, u.nombre
      HAVING COUNT(v.id) > 0
      ORDER BY total_vendido DESC
    `, params);
    return rows;
  }

  /**
   * Top productos vendidos en un rango (dinámico, no depende de la vista materializada).
   */
  static async topProductos({ desde, hasta, limit = 10 } = {}) {
    const cond = ["v.estado = 'completada'"];
    const params = [];
    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }
    params.push(limit);

    const { rows } = await pool.query(`
      SELECT
        p.id, p.codigo, p.nombre,
        SUM(dv.cantidad)::int AS unidades_vendidas,
        SUM(dv.subtotal)::numeric AS facturacion,
        SUM(dv.subtotal - dv.costo_unitario * dv.cantidad)::numeric AS ganancia
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.venta_id AND ${cond.join(' AND ')}
      JOIN productos p ON p.id = dv.producto_id
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY unidades_vendidas DESC
      LIMIT $${params.length}
    `, params);
    return rows;
  }

  /**
   * Resumen general en un rango: total ventas, ticket promedio, ganancia.
   */
  static async resumen({ desde, hasta } = {}) {
    const cond = ["estado = 'completada'"];
    const params = [];
    if (desde) { params.push(desde); cond.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`fecha <= $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS cantidad_ventas,
        COALESCE(SUM(total), 0)::numeric AS total_vendido,
        COALESCE(SUM(costo_total), 0)::numeric AS costo_total,
        COALESCE(SUM(ganancia), 0)::numeric AS ganancia_total,
        COALESCE(AVG(total), 0)::numeric AS ticket_promedio
      FROM ventas
      WHERE ${cond.join(' AND ')}
    `, params);
    return rows[0];
  }
}