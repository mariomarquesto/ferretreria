-- Productos
INSERT INTO productos
  (codigo, codigo_barras, nombre, descripcion, categoria_id, marca_id, unidad_id,
   precio_compra, precio_venta, stock, stock_minimo, stock_maximo, ubicacion)
SELECT
  'P' || LPAD(g.n::text, 5, '0'),
  '77900000' || LPAD(g.n::text, 5, '0'),
  (ARRAY['Martillo de acero 500g','Destornillador Philips #2','Taladro percutor 650W',
    'Amoladora angular 115mm','Llave ajustable 10"','Cinta métrica 5m',
    'Cemento Portland 50kg','Arena fina (bolsa 25kg)','Pintura látex blanco 20L',
    'Rodillo antigota','Grifería monocomando','Caño PVC 110mm x 3m',
    'Cable unipolar 2.5mm x 100m','Llave térmica 20A','Tornillos autoperforantes x100',
    'Tarugos plásticos x50','Sika 1 x 5kg','Manguera jardín 20m',
    'Pala punta corazón','Serrucho 22"'])[g.n],
  'Producto de alta rotación',
  ((g.n - 1) % 8) + 1,
  ((g.n - 1) % 8) + 1,
  1,
  ROUND((RANDOM() * 3000 + 500)::numeric, 2),
  ROUND((RANDOM() * 5000 + 1500)::numeric, 2),
  (RANDOM() * 100 + 5)::int,
  5,
  200,
  'Pasillo ' || CHR(65 + (g.n % 5)) || ' - Estante ' || ((g.n % 10) + 1)
FROM generate_series(1, 20) AS g(n)
ON CONFLICT (codigo) DO NOTHING;

-- Proveedores
INSERT INTO proveedores (nombre, cuit, telefono, email, direccion, contacto)
SELECT * FROM (VALUES
  ('Distribuidora Norte S.A.', '30-12345678-9', '011-4555-1001', 'ventas@norte.com', 'Av. Industrial 1200', 'Carlos Pérez'),
  ('Ferretera Mayorista del Sur', '30-98765432-1', '011-4555-2002', 'info@mayoristasur.com', 'Ruta 3 Km 25', 'María Gómez'),
  ('Importadora China Tools', '30-55555555-5', '011-4555-3003', 'pedidos@chinatools.com', 'Zona Franca', 'Li Wei')
) AS v(nombre, cuit, telefono, email, direccion, contacto)
WHERE NOT EXISTS (SELECT 1 FROM proveedores p WHERE p.nombre = v.nombre);

-- Clientes
INSERT INTO clientes (nombre, cuit_dni, telefono, email, direccion)
SELECT * FROM (VALUES
  ('Juan Pérez', '20345678901', '11-5555-1111', 'juan@mail.com', 'Calle Falsa 123'),
  ('Constructora XYZ', '30-77777777-7', '11-5555-2222', 'compras@xyz.com', 'Av. Obra 456'),
  ('María López', '27876543210', '11-5555-3333', 'maria@mail.com', 'Belgrano 789')
) AS v(nombre, cuit_dni, telefono, email, direccion)
WHERE NOT EXISTS (SELECT 1 FROM clientes c WHERE c.email = v.email);