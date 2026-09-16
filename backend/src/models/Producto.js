import { pool } from '../config/db.js';
import { BaseModel } from './BaseModel.js';

export class Producto extends BaseModel {
  static tableName = 'productos';
  static fillable = [
    'codigo', 'codigo_barras', 'nombre', 'descripcion',
    'categoria_id', 'marca_id', 'unidad_id',
    'precio_compra', 'precio_venta', 'iva',
    'stock', 'stock_minimo', 'stock_maximo',
    'ubicacion', 'imagen_url', 'activo',
    'permite_decimales', 'presentacion',
    'unidades_por_presentacion', 'precio_por_presentacion'
  ];
  static searchable = ['nombre', 'codigo', 'codigo_barras'];

  static async findAllDetailed({ search, categoria_id, marca_id, soloActivos = true, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (soloActivos) conditions.push('p.activo = TRUE');

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.codigo_barras ILIKE $${params.length})`);
    }
    if (categoria_id) { params.push(categoria_id); conditions.push(`p.categoria_id = $${params.length}`); }
    if (marca_id) { params.push(marca_id); conditions.push(`p.marca_id = $${params.length}`); }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT
        p.*,
        c.nombre AS categoria,
        m.nombre AS marca,
        u.codigo AS unidad,
        u.nombre AS unidad_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
      LEFT JOIN unidades_medida u ON u.id = p.unidad_id
      ${whereSQL}
      ORDER BY p.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  static async findByCodigo(codigo) {
    const { rows } = await pool.query('SELECT * FROM productos WHERE codigo = $1', [codigo]);
    return rows[0] || null;
  }

  static async findByCodigoBarras(codigo) {
    const { rows } = await pool.query('SELECT * FROM productos WHERE codigo_barras = $1', [codigo]);
    return rows[0] || null;
  }

  static async stockBajo() {
    const { rows } = await pool.query(`
      SELECT id, codigo, nombre, stock, stock_minimo, ubicacion
      FROM productos
      WHERE activo = TRUE AND stock <= stock_minimo
      ORDER BY stock ASC
    `);
    return rows;
  }

  static async ajustarStock(id, { tipo, cantidad, motivo }, usuario_id = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [prod] } = await client.query(
        'SELECT stock FROM productos WHERE id = $1 FOR UPDATE', [id]
      );
      if (!prod) throw new Error('Producto no encontrado');

      const stockAnt = prod.stock;
      const delta = tipo === 'entrada' ? cantidad : -cantidad;
      const stockNvo = stockAnt + delta;
      if (stockNvo < 0) throw new Error('Stock no puede ser negativo');

      await client.query('UPDATE productos SET stock = $1 WHERE id = $2', [stockNvo, id]);
      await client.query(`
        INSERT INTO movimientos_stock
          (producto_id, tipo, motivo, cantidad, stock_anterior, stock_posterior, usuario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, tipo, motivo || 'ajuste manual', delta, stockAnt, stockNvo, usuario_id]);

      await client.query('COMMIT');
      return { stock_anterior: stockAnt, stock_posterior: stockNvo };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}