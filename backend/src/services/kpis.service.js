import { pool } from '../config/db.js';

export class KpisService {
  /**
   * Dashboard completo con todos los KPIs.
   */
  static async dashboard() {
    const [
      ventasHoy,
      ventasMes,
      gastosMes,
      comprasMes,
      topProductos,
      estancados,
      stockBajo,
      serie30dias,
      ventasPorFormaPago,
      topClientes,
      alertasNoLeidas,
      totalProductos,
      valorInventario
    ] = await Promise.all([
      // Ventas del día
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)::numeric AS total,
          COALESCE(SUM(ganancia), 0)::numeric AS ganancia,
          COUNT(*)::int AS cantidad,
          COALESCE(AVG(total), 0)::numeric AS ticket_promedio
        FROM ventas
        WHERE estado = 'completada' AND fecha::date = CURRENT_DATE
      `),
      // Ventas del mes
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)::numeric AS total,
          COALESCE(SUM(ganancia), 0)::numeric AS ganancia,
          COUNT(*)::int AS cantidad
        FROM ventas
        WHERE estado = 'completada'
          AND fecha >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      // Gastos del mes
      pool.query(`
        SELECT COALESCE(SUM(monto), 0)::numeric AS total
        FROM gastos
        WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      // Compras del mes
      pool.query(`
        SELECT COALESCE(SUM(total), 0)::numeric AS total
        FROM compras
        WHERE estado != 'anulada'
          AND fecha >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      // Top 10 productos del mes
      pool.query(`
        SELECT
          p.id, p.codigo, p.nombre,
          SUM(dv.cantidad)::int AS unidades_vendidas,
          SUM(dv.subtotal)::numeric AS facturacion,
          SUM(dv.subtotal - dv.costo_unitario * dv.cantidad)::numeric AS ganancia
        FROM detalle_venta dv
        JOIN ventas v ON v.id = dv.venta_id AND v.estado = 'completada'
        JOIN productos p ON p.id = dv.producto_id
        WHERE v.fecha >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.codigo, p.nombre
        ORDER BY unidades_vendidas DESC
        LIMIT 10
      `),
      // Productos sin movimiento +30 días
      pool.query(`
        SELECT
          p.id, p.codigo, p.nombre, p.stock,
          (p.stock * p.precio_compra)::numeric AS capital_inmovilizado,
          COALESCE(MAX(v.fecha), p.created_at) AS ultima_venta,
          EXTRACT(DAY FROM NOW() - COALESCE(MAX(v.fecha), p.created_at))::int AS dias_sin_venta
        FROM productos p
        LEFT JOIN detalle_venta dv ON dv.producto_id = p.id
        LEFT JOIN ventas v ON v.id = dv.venta_id AND v.estado = 'completada'
        WHERE p.activo = TRUE AND p.stock > 0
        GROUP BY p.id
        HAVING COALESCE(MAX(v.fecha), p.created_at) < NOW() - INTERVAL '30 days'
        ORDER BY capital_inmovilizado DESC
        LIMIT 15
      `),
      // Stock bajo mínimo
      pool.query(`
        SELECT id, codigo, nombre, stock, stock_minimo, ubicacion
        FROM productos
        WHERE activo = TRUE AND stock <= stock_minimo
        ORDER BY stock ASC
      `),
      // Serie temporal 30 días
      pool.query(`
        SELECT
          d.dia::date AS dia,
          COALESCE(v.total, 0)::numeric AS ventas,
          COALESCE(v.ganancia, 0)::numeric AS ganancia,
          COALESCE(v.cantidad, 0)::int AS cantidad
        FROM generate_series(NOW() - INTERVAL '29 days', NOW(), '1 day') d(dia)
        LEFT JOIN (
          SELECT
            fecha::date AS dia,
            SUM(total) AS total,
            SUM(ganancia) AS ganancia,
            COUNT(*) AS cantidad
          FROM ventas
          WHERE estado = 'completada' AND fecha >= NOW() - INTERVAL '30 days'
          GROUP BY fecha::date
        ) v ON v.dia = d.dia::date
        ORDER BY dia
      `),
      // Ventas por forma de pago (mes actual)
      pool.query(`
        SELECT
          forma_pago,
          COUNT(*)::int AS cantidad,
          COALESCE(SUM(total), 0)::numeric AS total
        FROM ventas
        WHERE estado = 'completada'
          AND fecha >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY forma_pago
        ORDER BY total DESC
      `),
      // Top 5 clientes del mes
      pool.query(`
        SELECT
          c.id, c.nombre,
          COUNT(v.id)::int AS cantidad_ventas,
          COALESCE(SUM(v.total), 0)::numeric AS total_comprado
        FROM clientes c
        JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
        WHERE v.fecha >= NOW() - INTERVAL '90 days'
        GROUP BY c.id, c.nombre
        ORDER BY total_comprado DESC
        LIMIT 5
      `),
      // Alertas sin leer
      pool.query('SELECT COUNT(*)::int AS total FROM alertas WHERE leida = FALSE'),
      // Total productos activos
      pool.query('SELECT COUNT(*)::int AS total FROM productos WHERE activo = TRUE'),
      // Valor del inventario
      pool.query(`
        SELECT
          COALESCE(SUM(stock * precio_compra), 0)::numeric AS costo,
          COALESCE(SUM(stock * precio_venta), 0)::numeric AS venta_potencial
        FROM productos
        WHERE activo = TRUE
      `)
    ]);

    const vh = ventasHoy.rows[0];
    const vm = ventasMes.rows[0];
    const gm = gastosMes.rows[0];
    const cm = comprasMes.rows[0];

    const gananciaNetaMes = Number(vm.ganancia) - Number(gm.total);

    return {
      // KPIs principales
      ventas_hoy: vh,
      ventas_mes: {
        ...vm,
        ganancia_neta: gananciaNetaMes.toFixed(2)
      },
      gastos_mes: gm,
      compras_mes: cm,

      // Contadores
      total_productos: totalProductos.rows[0].total,
      valor_inventario: valorInventario.rows[0],
      alertas_no_leidas: alertasNoLeidas.rows[0].total,

      // Rankings
      top_productos: topProductos.rows,
      productos_estancados: estancados.rows,
      stock_bajo: stockBajo.rows,
      top_clientes: topClientes.rows,

      // Series y distribuciones
      serie_30_dias: serie30dias.rows,
      ventas_por_forma_pago: ventasPorFormaPago.rows
    };
  }

  /**
   * Reporte de rentabilidad en un rango de fechas.
   */
  static async rentabilidad({ desde, hasta } = {}) {
    const cond = ["v.estado = 'completada'"];
    const params = [];

    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }

    const where = cond.join(' AND ');

    const [ventas, gastos, compras] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)::numeric AS ingresos,
          COALESCE(SUM(costo_total), 0)::numeric AS cmv,
          COALESCE(SUM(ganancia), 0)::numeric AS ganancia_bruta,
          COUNT(*)::int AS cantidad_ventas,
          COALESCE(AVG(total), 0)::numeric AS ticket_promedio
        FROM ventas v
        WHERE ${where}
      `, params),
      pool.query(`
        SELECT COALESCE(SUM(monto), 0)::numeric AS total
        FROM gastos
        WHERE fecha BETWEEN COALESCE($1::timestamp, '1900-01-01') AND COALESCE($2::timestamp, NOW())
      `, [desde || null, hasta || null]),
      pool.query(`
        SELECT COALESCE(SUM(total), 0)::numeric AS total
        FROM compras
        WHERE estado != 'anulada'
          AND fecha BETWEEN COALESCE($1::timestamp, '1900-01-01') AND COALESCE($2::timestamp, NOW())
      `, [desde || null, hasta || null])
    ]);

    const ingresos = Number(ventas.rows[0].ingresos);
    const cmv = Number(ventas.rows[0].cmv);
    const gananciaBruta = Number(ventas.rows[0].ganancia_bruta);
    const gastosTotales = Number(gastos.rows[0].total);
    const comprasTotales = Number(compras.rows[0].total);
    const gananciaNeta = gananciaBruta - gastosTotales;

    return {
      rango: { desde, hasta },
      ingresos: ingresos.toFixed(2),
      cmv: cmv.toFixed(2),
      ganancia_bruta: gananciaBruta.toFixed(2),
      margen_bruto_pct: ingresos > 0 ? ((gananciaBruta / ingresos) * 100).toFixed(2) : '0.00',
      gastos: gastosTotales.toFixed(2),
      ganancia_neta: gananciaNeta.toFixed(2),
      margen_neto_pct: ingresos > 0 ? ((gananciaNeta / ingresos) * 100).toFixed(2) : '0.00',
      compras: comprasTotales.toFixed(2),
      cantidad_ventas: ventas.rows[0].cantidad_ventas,
      ticket_promedio: Number(ventas.rows[0].ticket_promedio).toFixed(2)
    };
  }

  /**
   * Utilidad por producto en un rango.
   */
  static async utilidadPorProducto({ desde, hasta, limit = 50 } = {}) {
    const cond = ["v.estado = 'completada'"];
    const params = [];

    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }
    params.push(limit);

    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        SUM(dv.cantidad)::int AS unidades,
        SUM(dv.subtotal)::numeric AS facturacion,
        SUM(dv.costo_unitario * dv.cantidad)::numeric AS costo,
        SUM(dv.subtotal - dv.costo_unitario * dv.cantidad)::numeric AS ganancia,
        ROUND(
          100.0 * SUM(dv.subtotal - dv.costo_unitario * dv.cantidad)
          / NULLIF(SUM(dv.subtotal), 0),
          2
        ) AS margen_pct
      FROM detalle_venta dv
      JOIN ventas v ON v.id = dv.venta_id AND ${cond.join(' AND ')}
      JOIN productos p ON p.id = dv.producto_id
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY ganancia DESC
      LIMIT $${params.length}
    `, params);
    return rows;
  }

  /**
   * Flujo de caja mensual (últimos 12 meses).
   */
  static async flujoCaja() {
    const { rows } = await pool.query(`
      WITH meses AS (
        SELECT TO_CHAR(d, 'YYYY-MM') AS periodo, d
        FROM generate_series(
          DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
          DATE_TRUNC('month', NOW()),
          '1 month'
        ) d
      )
      SELECT
        m.periodo,
        COALESCE(v.total, 0)::numeric AS ventas,
        COALESCE(v.ganancia, 0)::numeric AS ganancia_bruta,
        COALESCE(c.total, 0)::numeric AS compras,
        COALESCE(g.total, 0)::numeric AS gastos,
        (COALESCE(v.ganancia, 0) - COALESCE(g.total, 0))::numeric AS ganancia_neta
      FROM meses m
      LEFT JOIN (
        SELECT TO_CHAR(fecha, 'YYYY-MM') AS periodo,
               SUM(total) AS total, SUM(ganancia) AS ganancia
        FROM ventas WHERE estado = 'completada'
        GROUP BY 1
      ) v ON v.periodo = m.periodo
      LEFT JOIN (
        SELECT TO_CHAR(fecha, 'YYYY-MM') AS periodo, SUM(total) AS total
        FROM compras WHERE estado != 'anulada'
        GROUP BY 1
      ) c ON c.periodo = m.periodo
      LEFT JOIN (
        SELECT TO_CHAR(fecha, 'YYYY-MM') AS periodo, SUM(monto) AS total
        FROM gastos GROUP BY 1
      ) g ON g.periodo = m.periodo
      ORDER BY m.periodo
    `);
    return rows;
  }

  /**
   * Ranking de vendedores.
   */
  static async rankingVendedores({ desde, hasta } = {}) {
    const cond = ["v.estado = 'completada'", 'v.usuario_id IS NOT NULL'];
    const params = [];
    if (desde) { params.push(desde); cond.push(`v.fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); cond.push(`v.fecha <= $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT
        u.id, u.nombre AS vendedor,
        COUNT(v.id)::int AS cantidad_ventas,
        COALESCE(SUM(v.total), 0)::numeric AS total_vendido,
        COALESCE(SUM(v.ganancia), 0)::numeric AS ganancia_generada
      FROM usuarios u
      LEFT JOIN ventas v ON v.usuario_id = u.id AND ${cond.join(' AND ')}
      GROUP BY u.id, u.nombre
      HAVING COUNT(v.id) > 0
      ORDER BY total_vendido DESC
    `, params);
    return rows;
  }

  static async refrescarVistas() {
    await pool.query('REFRESH MATERIALIZED VIEW mv_top_productos');
    await pool.query('REFRESH MATERIALIZED VIEW mv_productos_estancados');
    await pool.query('REFRESH MATERIALIZED VIEW mv_resumen_diario');
    return { ok: true };
  }
}