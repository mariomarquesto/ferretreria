CREATE INDEX IF NOT EXISTS idx_productos_busqueda
  ON productos USING gin (to_tsvector('spanish', nombre || ' ' || COALESCE(codigo, '')));

CREATE INDEX IF NOT EXISTS idx_productos_barras ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo) WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(producto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_producto ON detalle_compra(producto_id);

CREATE INDEX IF NOT EXISTS idx_mov_producto_fecha ON movimientos_stock(producto_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON gastos(tipo_id);