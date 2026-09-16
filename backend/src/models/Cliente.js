import { BaseModel } from './BaseModel.js';
import { pool } from '../config/db.js';

export class Cliente extends BaseModel {
  static tableName = 'clientes';
  static fillable = [
    'usuario_id',
    'nombre',
    'cuit_dni',
    'telefono',
    'email',
    'direccion',
    'saldo',
    'limite_credito'
  ];
  static searchable = ['nombre', 'cuit_dni', 'email', 'telefono'];

  /**
   * Lista de clientes con búsqueda y paginación.
   */
  static async listar({ search, limit = 100, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      cond.push(`(c.nombre ILIKE $${params.length}
                  OR c.cuit_dni ILIKE $${params.length}
                  OR c.email ILIKE $${params.length}
                  OR c.telefono ILIKE $${params.length})`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    params.push(limit, offset);
    const { rows } = await pool.query(`
      SELECT c.*,
             COUNT(v.id)::int AS ventas_count,
             COALESCE(SUM(v.total), 0)::numeric AS total_comprado
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
      ${where}
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return rows;
  }

  /**
   * Detalle del cliente con sus últimas ventas.
   */
  static async findDetailed(id) {
    const { rows: [cliente] } = await pool.query(
      'SELECT * FROM clientes WHERE id = $1', [id]
    );
    if (!cliente) return null;

    const { rows: ventas } = await pool.query(`
      SELECT id, numero, fecha, total, estado, forma_pago
      FROM ventas
      WHERE cliente_id = $1
      ORDER BY fecha DESC
      LIMIT 20
    `, [id]);

    return { ...cliente, ventas };
  }

  /**
   * Busca por email (útil para prevenir duplicados).
   */
  static async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM clientes WHERE email = $1', [email]
    );
    return rows[0] || null;
  }

  /**
   * Busca por CUIT/DNI.
   */
  static async findByCuit(cuit_dni) {
    const { rows } = await pool.query(
      'SELECT * FROM clientes WHERE cuit_dni = $1', [cuit_dni]
    );
    return rows[0] || null;
  }

  /**
   * Top clientes por facturación.
   */
  static async top({ limit = 10 } = {}) {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.nombre, c.email, c.telefono,
        COUNT(v.id)::int AS cantidad_ventas,
        COALESCE(SUM(v.total), 0)::numeric AS total_comprado
      FROM clientes c
      LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
      GROUP BY c.id
      HAVING COUNT(v.id) > 0
      ORDER BY total_comprado DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }
}