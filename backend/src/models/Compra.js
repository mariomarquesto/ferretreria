import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Compra extends BaseModel {
  static tableName = 'compras';
  static fillable = [
    'numero', 'proveedor_id', 'usuario_id', 'subtotal', 'iva',
    'total', 'estado', 'forma_pago', 'observaciones'
  ];

  /**
   * Listado con joins de proveedor y usuario.
   */
  static async listar({ desde, hasta, proveedor_id, estado, limit = 100, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (desde) { params.push(desde); cond.push(`c.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`c.fecha <= $${params.length}`); }
    if (proveedor_id) { params.push(proveedor_id); cond.push(`c.proveedor_id = $${params.length}`); }
    if (estado) { params.push(estado); cond.push(`c.estado = $${params.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        c.*,
        p.nombre AS proveedor,
        u.nombre AS usuario,
        COUNT(dc.id)::int AS items_count
      FROM compras c
      LEFT JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      LEFT JOIN detalle_compra dc ON dc.compra_id = c.id
      ${where}
      GROUP BY c.id, p.nombre, u.nombre
      ORDER BY c.fecha DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Detalle completo de una compra con items.
   */
  static async findDetailed(id) {
    const { rows: [compra] } = await pool.query(`
      SELECT
        c.*,
        p.nombre AS proveedor,
        p.cuit AS proveedor_cuit,
        u.nombre AS usuario
      FROM compras c
      LEFT JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.id = $1
    `, [id]);

    if (!compra) return null;

    const { rows: items } = await pool.query(`
      SELECT
        dc.id,
        dc.producto_id,
        dc.cantidad,
        dc.precio_unitario,
        dc.subtotal,
        p.codigo,
        p.nombre AS producto,
        p.stock AS stock_actual
      FROM detalle_compra dc
      JOIN productos p ON p.id = dc.producto_id
      WHERE dc.compra_id = $1
      ORDER BY dc.id
    `, [id]);

    return { ...compra, items };
  }

  /**
   * Resumen de compras por proveedor en un rango.
   */
  static async resumenPorProveedor({ desde, hasta } = {}) {
    const cond = ["c.estado != 'anulada'"];
    const params = [];
    if (desde) { params.push(desde); cond.push(`c.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`c.fecha <= $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT
        p.id AS proveedor_id,
        p.nombre AS proveedor,
        COUNT(c.id)::int AS cantidad_compras,
        COALESCE(SUM(c.total), 0)::numeric AS total_comprado
      FROM proveedores p
      LEFT JOIN compras c ON c.proveedor_id = p.id AND ${cond.join(' AND ')}
      GROUP BY p.id, p.nombre
      ORDER BY total_comprado DESC
    `, params);
    return rows;
  }
}