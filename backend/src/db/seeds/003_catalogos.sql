-- Categorías
INSERT INTO categorias (nombre, descripcion)
SELECT * FROM (VALUES
  ('Herramientas manuales', 'Martillos, destornilladores, llaves'),
  ('Herramientas eléctricas', 'Taladros, amoladoras, sierras'),
  ('Plomería', 'Caños, conexiones, grifería'),
  ('Electricidad', 'Cables, llaves térmicas, tomas'),
  ('Pinturería', 'Pinturas, rodillos, pinceles'),
  ('Construcción', 'Cemento, arena, ladrillos'),
  ('Jardín', 'Mangueras, palas, semillas'),
  ('Fijaciones', 'Tornillos, tarugos, clavos')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM categorias c WHERE c.nombre = v.nombre);

-- Marcas
INSERT INTO marcas (nombre)
SELECT * FROM (VALUES
  ('Truper'), ('Black+Decker'), ('Bosch'), ('Stanley'),
  ('Sika'), ('Weber'), ('Sica'), ('Tigre')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM marcas m WHERE m.nombre = v.nombre);

-- Unidades de medida
INSERT INTO unidades_medida (codigo, nombre)
SELECT * FROM (VALUES
  ('UN', 'Unidad'), ('KG', 'Kilogramo'), ('MT', 'Metro'),
  ('LT', 'Litro'), ('CAJA', 'Caja'), ('M2', 'Metro cuadrado')
) AS v(codigo, nombre)
WHERE NOT EXISTS (SELECT 1 FROM unidades_medida u WHERE u.codigo = v.codigo);

-- Tipos de gasto
INSERT INTO tipos_gasto (nombre, categoria)
SELECT * FROM (VALUES
  ('Alquiler', 'fijo'),
  ('Sueldos', 'fijo'),
  ('Energía eléctrica', 'variable'),
  ('Internet y teléfono', 'variable'),
  ('Flete y logística', 'variable'),
  ('Impuestos', 'impuesto'),
  ('Mantenimiento', 'variable')
) AS v(nombre, categoria)
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto t WHERE t.nombre = v.nombre);