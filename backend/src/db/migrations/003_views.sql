-- Top productos vendidos (últimos 30 días)
DROP MATERIALIZED VIEW IF EXISTS mv_top_productos CASCADE;
CREATE MATERIALIZED VIEW mv_top_productos AS
SELECT
  p.id, p.codigo, p.nombre,
  SUM(dv.cantidad) AS unidades_vendidas,
  SUM(dv.subtotal) AS facturacion,
  SUM(dv.subtotal - (dv.costo_unitario * dv.cantidad)) AS ganancia,
  RANK() OVER (ORDER BY SUM(dv.cantidad) DESC) AS ranking
FROM detalle_venta dv
JOIN ventas v ON v.id = dv.venta_id AND v.estado = 'completada'
JOIN productos p ON p.id = dv.producto_id
WHERE v.fecha >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.codigo, p.nombre;

CREATE UNIQUE INDEX idx_mv_top_productos_id ON mv_top_productos(id);

-- Productos estancados (+30 días sin venta)
DROP MATERIALIZED VIEW IF EXISTS mv_productos_estancados CASCADE;
CREATE MATERIALIZED VIEW mv_productos_estancados AS
SELECT
  p.id, p.codigo, p.nombre, p.stock,
  p.stock * p.precio_compra AS capital_inmovilizado,
  COALESCE(MAX(v.fecha), p.created_at) AS ultima_venta,
  EXTRACT(DAY FROM NOW() - COALESCE(MAX(v.fecha), p.created_at))::int AS dias_sin_venta
FROM productos p
LEFT JOIN detalle_venta dv ON dv.producto_id = p.id
LEFT JOIN ventas v ON v.id = dv.venta_id AND v.estado = 'completada'
WHERE p.activo = TRUE AND p.stock > 0
GROUP BY p.id
HAVING COALESCE(MAX(v.fecha), p.created_at) < NOW() - INTERVAL '30 days'
ORDER BY capital_inmovilizado DESC;

CREATE UNIQUE INDEX idx_mv_estancados_id ON mv_productos_estancados(id);

-- Resumen diario
DROP MATERIALIZED VIEW IF EXISTS mv_resumen_diario CASCADE;
CREATE MATERIALIZED VIEW mv_resumen_diario AS
SELECT
  d.dia::date AS dia,
  COALESCE(v.ventas_total, 0) AS ventas,
  COALESCE(v.ganancia_total, 0) AS ganancia_bruta,
  COALESCE(c.compras_total, 0) AS compras,
  COALESCE(g.gastos_total, 0) AS gastos,
  COALESCE(v.ganancia_total, 0) - COALESCE(g.gastos_total, 0) AS ganancia_neta,
  COALESCE(v.ticket_promedio, 0) AS ticket_promedio,
  COALESCE(v.cantidad_ventas, 0) AS cantidad_ventas
FROM generate_series(NOW() - INTERVAL '365 days', NOW(), '1 day') d(dia)
LEFT JOIN (
  SELECT DATE(fecha) dia, SUM(total) ventas_total, SUM(ganancia) ganancia_total,
         AVG(total) ticket_promedio, COUNT(*) cantidad_ventas
  FROM ventas WHERE estado='completada' GROUP BY 1
) v ON v.dia = d.dia::date
LEFT JOIN (
  SELECT DATE(fecha) dia, SUM(total) compras_total
  FROM compras WHERE estado!='anulada' GROUP BY 1
) c ON c.dia = d.dia::date
LEFT JOIN (
  SELECT DATE(fecha) dia, SUM(monto) gastos_total FROM gastos GROUP BY 1
) g ON g.dia = d.dia::date;

CREATE UNIQUE INDEX idx_mv_resumen_dia ON mv_resumen_diario(dia);