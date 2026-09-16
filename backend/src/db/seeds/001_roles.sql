INSERT INTO roles (nombre, permisos) VALUES
  ('admin', '{"todo": true}'::jsonb),
  ('vendedor', '{"ventas": true, "productos": "read", "clientes": true}'::jsonb),
  ('almacen', '{"productos": true, "compras": true, "inventario": true}'::jsonb),
  ('cliente', '{"shop": true, "pedidos": true}'::jsonb)
ON CONFLICT (nombre) DO NOTHING;