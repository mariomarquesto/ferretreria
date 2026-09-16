import { BaseModel } from './BaseModel.js';
import { pool } from '../config/db.js';

export class Proveedor extends BaseModel {
  static tableName = 'proveedores';
  static fillable = [
    'nombre', 'cuit', 'telefono', 'email', 'direccion', 'contacto', 'saldo', 'activo'
  ];
  static searchable = ['nombre', 'cuit', 'email', 'contacto'];

  /**
   * Listado con stats: cuántas compras y monto total.
   */
  static async listar({ search, limit = 100, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      cond.push(`(p.nombre ILIKE $${params.length}
                  OR p.cuit ILIKE $${params.length}
                  OR p.email ILIKE $${params.length}
                  OR p.contacto ILIKE $${params.length})`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        p.*,
        COUNT(c.id)::int AS compras_count,
        COALESCE(SUM(c.total), 0)::numeric AS total_comprado
      FROM proveedores p
      LEFT JOIN compras c ON c.proveedor_id = p.id AND c.estado != 'anulada'
      ${where}
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Detalle con últimas compras.
   */
  static async findDetailed(id) {
    const { rows: [prov] } = await pool.query(
      'SELECT * FROM proveedores WHERE id = $1', [id]
    );
    if (!prov) return null;

    const { rows: compras } = await pool.query(`
      SELECT id, numero, fecha, total, estado, forma_pago
      FROM compras
      WHERE proveedor_id = $1
      ORDER BY fecha DESC
      LIMIT 20
    `, [id]);

    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_compras,
        COALESCE(SUM(total), 0)::numeric AS total_comprado,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END), 0)::numeric AS saldo_pendiente
      FROM compras
      WHERE proveedor_id = $1 AND estado != 'anulada'
    `, [id]);

    return { ...prov, compras, stats };
  }

  static async findByNombre(nombre) {
    const { rows } = await pool.query('SELECT * FROM proveedores WHERE nombre = $1', [nombre]);
    return rows[0] || null;
  }
}