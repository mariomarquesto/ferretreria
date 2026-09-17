import { pool } from '../../config/db.js';

export class SegmentacionService {
  /**
   * Lista completa de clientes con segmentación
   */
  static async listarConSegmentos({ search, segmento, tipo_cliente, limit = 100, offset = 0 } = {}) {
    const cond = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      cond.push(`(c.nombre ILIKE $${params.length}
                 OR c.email ILIKE $${params.length}
                 OR c.telefono ILIKE $${params.length}
                 OR c.cuit_dni ILIKE $${params.length})`);
    }
    if (tipo_cliente) {
      params.push(tipo_cliente);
      cond.push(`c.tipo_cliente = $${params.length}`);
    }
    if (segmento) {
      params.push(segmento);
      cond.push(`(
        CASE
          WHEN v.ultima_compra IS NULL THEN 'nuevo'
          WHEN v.ultima_compra >= NOW() - INTERVAL '30 days' THEN 'activo'
          WHEN v.ultima_compra >= NOW() - INTERVAL '60 days' THEN 'tibio'
          WHEN v.ultima_compra >= NOW() - INTERVAL '90 days' THEN 'frio'
          ELSE 'inactivo'
        END = $${params.length}
        OR
        CASE
          WHEN COALESCE(v.total_comprado, 0) >= 500000 THEN 'vip'
          WHEN COALESCE(v.total_comprado, 0) >= 100000 THEN 'frecuente'
          WHEN COALESCE(v.total_comprado, 0) >= 20000 THEN 'ocasional'
          ELSE 'esporadico'
        END = $${params.length}
      )`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT
        c.id, c.nombre, c.email, c.telefono, c.direccion, c.cuit_dni,
        c.tipo_cliente, c.etiquetas, c.fecha_nacimiento, c.avatar_url,
        c.instagram, c.facebook, c.canal_preferido, c.saldo, c.limite_credito,
        c.created_at,
        COALESCE(v.total_comprado, 0) AS total_comprado,
        COALESCE(v.cantidad_compras, 0) AS cantidad_compras,
        v.ultima_compra,
        COALESCE(v.ticket_promedio, 0) AS ticket_promedio,
        CASE
          WHEN v.ultima_compra IS NULL THEN 'nuevo'
          WHEN v.ultima_compra >= NOW() - INTERVAL '30 days' THEN 'activo'
          WHEN v.ultima_compra >= NOW() - INTERVAL '60 days' THEN 'tibio'
          WHEN v.ultima_compra >= NOW() - INTERVAL '90 days' THEN 'frio'
          ELSE 'inactivo'
        END AS segmento_actividad,
        CASE
          WHEN COALESCE(v.total_comprado, 0) >= 500000 THEN 'vip'
          WHEN COALESCE(v.total_comprado, 0) >= 100000 THEN 'frecuente'
          WHEN COALESCE(v.total_comprado, 0) >= 20000 THEN 'ocasional'
          ELSE 'esporadico'
        END AS segmento_valor
      FROM clientes c
      LEFT JOIN (
        SELECT
          cliente_id,
          SUM(total) AS total_comprado,
          COUNT(*) AS cantidad_compras,
          MAX(fecha) AS ultima_compra,
          AVG(total) AS ticket_promedio
        FROM ventas
        WHERE estado = 'completada' AND cliente_id IS NOT NULL
        GROUP BY cliente_id
      ) v ON v.cliente_id = c.id
      ${where}
      ORDER BY v.total_comprado DESC NULLS LAST, c.nombre ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return rows;
  }

  /**
   * Ficha completa de un cliente con historial
   */
  static async fichaCompleta(clienteId) {
    // 1. Datos del cliente
    const { rows: [cliente] } = await pool.query(`
      SELECT
        c.*,
        u.nombre AS vendedor_asignado
      FROM clientes c
      LEFT JOIN usuarios u ON u.id = c.vendedor_asignado_id
      WHERE c.id = $1
    `, [clienteId]);

    if (!cliente) return null;

    // 2. Estadísticas
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_compras,
        COALESCE(SUM(total), 0)::numeric AS total_comprado,
        COALESCE(AVG(total), 0)::numeric AS ticket_promedio,
        MAX(fecha) AS ultima_compra,
        MIN(fecha) AS primera_compra
      FROM ventas
      WHERE cliente_id = $1 AND estado = 'completada'
    `, [clienteId]);

    // 3. Historial de ventas
    const { rows: ventas } = await pool.query(`
      SELECT id, numero, fecha, total, forma_pago, estado
      FROM ventas
      WHERE cliente_id = $1
      ORDER BY fecha DESC
      LIMIT 20
    `, [clienteId]);

    // 4. Productos más comprados
    const { rows: productosFrecuentes } = await pool.query(`
      SELECT
        p.id, p.nombre, p.codigo,
        SUM(dv.cantidad)::int AS unidades,
        SUM(dv.subtotal)::numeric AS total
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.venta_id
      JOIN productos p ON p.id = dv.producto_id
      WHERE v.cliente_id = $1 AND v.estado = 'completada'
      GROUP BY p.id, p.nombre, p.codigo
      ORDER BY unidades DESC
      LIMIT 10
    `, [clienteId]);

    // 5. Tareas del cliente
    const { rows: tareas } = await pool.query(`
      SELECT
        t.*,
        u.nombre AS usuario_nombre
      FROM cliente_tareas t
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      WHERE t.cliente_id = $1
      ORDER BY
        CASE WHEN t.estado = 'pendiente' THEN 0 ELSE 1 END,
        t.fecha_programada ASC NULLS LAST
      LIMIT 20
    `, [clienteId]);

    // 6. Últimas comunicaciones
    const { rows: comunicaciones } = await pool.query(`
      SELECT * FROM cliente_comunicaciones
      WHERE cliente_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [clienteId]);

    return {
      ...cliente,
      stats,
      ventas,
      productosFrecuentes,
      tareas,
      comunicaciones
    };
  }

  /**
   * Resumen de segmentos para el dashboard
   */
  static async resumenSegmentos() {
    const { rows } = await pool.query(`
      WITH datos AS (
        SELECT
          c.id,
          CASE
            WHEN v.ultima_compra IS NULL THEN 'nuevo'
            WHEN v.ultima_compra >= NOW() - INTERVAL '30 days' THEN 'activo'
            WHEN v.ultima_compra >= NOW() - INTERVAL '60 days' THEN 'tibio'
            WHEN v.ultima_compra >= NOW() - INTERVAL '90 days' THEN 'frio'
            ELSE 'inactivo'
          END AS actividad,
          CASE
            WHEN COALESCE(v.total_comprado, 0) >= 500000 THEN 'vip'
            WHEN COALESCE(v.total_comprado, 0) >= 100000 THEN 'frecuente'
            WHEN COALESCE(v.total_comprado, 0) >= 20000 THEN 'ocasional'
            ELSE 'esporadico'
          END AS valor
        FROM clientes c
        LEFT JOIN (
          SELECT cliente_id, MAX(fecha) AS ultima_compra, SUM(total) AS total_comprado
          FROM ventas WHERE estado = 'completada' AND cliente_id IS NOT NULL
          GROUP BY cliente_id
        ) v ON v.cliente_id = c.id
      )
      SELECT
        (SELECT COUNT(*) FROM datos)::int AS total,
        (SELECT COUNT(*) FROM datos WHERE actividad = 'nuevo')::int AS nuevos,
        (SELECT COUNT(*) FROM datos WHERE actividad = 'activo')::int AS activos,
        (SELECT COUNT(*) FROM datos WHERE actividad = 'tibio')::int AS tibios,
        (SELECT COUNT(*) FROM datos WHERE actividad = 'frio')::int AS frios,
        (SELECT COUNT(*) FROM datos WHERE actividad = 'inactivo')::int AS inactivos,
        (SELECT COUNT(*) FROM datos WHERE valor = 'vip')::int AS vip,
        (SELECT COUNT(*) FROM datos WHERE valor = 'frecuente')::int AS frecuentes,
        (SELECT COUNT(*) FROM datos WHERE valor = 'ocasional')::int AS ocasionales,
        (SELECT COUNT(*) FROM datos WHERE valor = 'esporadico')::int AS esporadicos
    `);

    return rows[0];
  }
}