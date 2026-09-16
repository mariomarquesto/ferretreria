-- ==========================================================
-- Trigger: auto-update updated_at
-- ==========================================================
CREATE OR REPLACE FUNCTION fn_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_updated ON productos;
CREATE TRIGGER trg_productos_updated
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_usuarios_updated ON usuarios;
CREATE TRIGGER trg_usuarios_updated
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ==========================================================
-- Trigger: salida de stock al vender
-- ==========================================================
CREATE OR REPLACE FUNCTION fn_mov_stock_venta() RETURNS TRIGGER AS $$
DECLARE
  stock_ant INT;
  stock_nvo INT;
BEGIN
  SELECT stock INTO stock_ant FROM productos WHERE id = NEW.producto_id FOR UPDATE;
  stock_nvo := stock_ant - NEW.cantidad;

  IF stock_nvo < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para producto ID %', NEW.producto_id;
  END IF;

  UPDATE productos SET stock = stock_nvo WHERE id = NEW.producto_id;

  INSERT INTO movimientos_stock(producto_id, tipo, motivo, referencia_id, referencia_tipo,
                                cantidad, stock_anterior, stock_posterior, costo_unitario)
  VALUES (NEW.producto_id, 'salida', 'venta', NEW.venta_id, 'venta',
          -NEW.cantidad, stock_ant, stock_nvo, NEW.costo_unitario);

  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mov_stock_venta ON detalle_venta;
CREATE TRIGGER trg_mov_stock_venta
  AFTER INSERT ON detalle_venta
  FOR EACH ROW EXECUTE FUNCTION fn_mov_stock_venta();

-- ==========================================================
-- Trigger: entrada de stock al comprar
-- ==========================================================
CREATE OR REPLACE FUNCTION fn_mov_stock_compra() RETURNS TRIGGER AS $$
DECLARE
  stock_ant INT;
  stock_nvo INT;
BEGIN
  SELECT stock INTO stock_ant FROM productos WHERE id = NEW.producto_id FOR UPDATE;
  stock_nvo := stock_ant + NEW.cantidad;

  UPDATE productos
    SET stock = stock_nvo,
        precio_compra = NEW.precio_unitario
    WHERE id = NEW.producto_id;

  INSERT INTO movimientos_stock(producto_id, tipo, motivo, referencia_id, referencia_tipo,
                                cantidad, stock_anterior, stock_posterior, costo_unitario)
  VALUES (NEW.producto_id, 'entrada', 'compra', NEW.compra_id, 'compra',
          NEW.cantidad, stock_ant, stock_nvo, NEW.precio_unitario);

  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mov_stock_compra ON detalle_compra;
CREATE TRIGGER trg_mov_stock_compra
  AFTER INSERT ON detalle_compra
  FOR EACH ROW EXECUTE FUNCTION fn_mov_stock_compra();