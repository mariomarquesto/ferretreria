-- ============================================================
-- MIGRACIÓN 005: CRM Y MARKETING
-- ============================================================
-- Agrega campos CRM a clientes, tablas de comunicaciones,
-- tareas, campañas, y configuración de redes sociales.
-- ============================================================

-- ============================================================
-- 1. EXTENDER TABLA CLIENTES CON CAMPOS CRM
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(30) DEFAULT 'minorista',
  ADD COLUMN IF NOT EXISTS etiquetas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS canal_preferido VARCHAR(20) DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(100),
  ADD COLUMN IF NOT EXISTS facebook VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vendedor_asignado_id INT REFERENCES usuarios(id) ON DELETE SET NULL;

-- Comentarios
COMMENT ON COLUMN clientes.tipo_cliente IS 'minorista | mayorista | empresa | profesional';
COMMENT ON COLUMN clientes.etiquetas IS 'Array de etiquetas: ["VIP", "moroso", "activo"]';
COMMENT ON COLUMN clientes.canal_preferido IS 'whatsapp | email | llamada';

-- ============================================================
-- 2. HISTORIAL DE COMUNICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS cliente_comunicaciones (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  canal VARCHAR(20) NOT NULL,           -- whatsapp | instagram | tiktok | email | llamada
  direccion VARCHAR(20) NOT NULL,        -- enviado | recibido
  tipo VARCHAR(20),                      -- texto | imagen | video | documento
  asunto VARCHAR(200),
  mensaje TEXT,
  media_url TEXT,
  estado VARCHAR(20) DEFAULT 'enviado',  -- enviado | entregado | leido | respondido | fallo
  message_id VARCHAR(100),               -- ID externo (WhatsApp, etc.)
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_com_cliente ON cliente_comunicaciones(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_com_canal ON cliente_comunicaciones(canal);
CREATE INDEX IF NOT EXISTS idx_com_estado ON cliente_comunicaciones(estado);

-- ============================================================
-- 3. TAREAS Y RECORDATORIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS cliente_tareas (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_programada TIMESTAMP,
  prioridad VARCHAR(20) DEFAULT 'media',  -- baja | media | alta | urgente
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente | completada | vencida | cancelada
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tareas_cliente ON cliente_tareas(cliente_id, estado);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON cliente_tareas(fecha_programada) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_tareas_usuario ON cliente_tareas(usuario_id, estado);

-- ============================================================
-- 4. PIPELINE DE VENTAS (EMBUDO)
-- ============================================================
CREATE TABLE IF NOT EXISTS cliente_pipeline (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
  etapa VARCHAR(30) NOT NULL DEFAULT 'lead', -- lead | contactado | interesado | negociacion | cliente | perdido
  valor_estimado DECIMAL(12,2),
  notas TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_etapa ON cliente_pipeline(etapa);

-- ============================================================
-- 5. CAMPAÑAS DE MARKETING
-- ============================================================
CREATE TABLE IF NOT EXISTS campanas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  segmento VARCHAR(100),                -- vip | inactivos | electricistas | todos
  mensaje TEXT,
  canal VARCHAR(20),                    -- whatsapp | instagram | tiktok | email
  estado VARCHAR(20) DEFAULT 'borrador',-- borrador | activa | pausada | finalizada
  total_enviados INT DEFAULT 0,
  total_convertidos INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanas_estado ON campanas(estado);

-- ============================================================
-- 6. RELACIÓN CAMPAÑA-CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS campana_cliente (
  id SERIAL PRIMARY KEY,
  campana_id INT REFERENCES campanas(id) ON DELETE CASCADE,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  enviado BOOLEAN DEFAULT FALSE,
  enviado_at TIMESTAMP,
  convertido BOOLEAN DEFAULT FALSE,
  convertido_at TIMESTAMP,
  UNIQUE(campana_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_campcli_campana ON campana_cliente(campana_id);
CREATE INDEX IF NOT EXISTS idx_campcli_cliente ON campana_cliente(cliente_id);

-- ============================================================
-- 7. CONFIGURACIÓN DE REDES SOCIALES
-- ============================================================
CREATE TABLE IF NOT EXISTS redes_config (
  id SERIAL PRIMARY KEY,
  red VARCHAR(20) NOT NULL,              -- whatsapp | instagram | tiktok
  usuario_id VARCHAR(100),               -- ID en la red (no confundir con FK)
  usuario_handle VARCHAR(100),           -- @ferreteria
  access_token TEXT,
  refresh_token TEXT,
  token_expira TIMESTAMP,
  config JSONB DEFAULT '{}'::jsonb,       -- configuración extra
  activo BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(red)
);

COMMENT ON TABLE redes_config IS 'Credenciales y configuración de redes sociales';
COMMENT ON COLUMN redes_config.config IS 'JSON con configuración específica de cada red';

-- ============================================================
-- 8. PUBLICACIONES EN REDES
-- ============================================================
CREATE TABLE IF NOT EXISTS publicaciones_redes (
  id SERIAL PRIMARY KEY,
  producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
  red VARCHAR(20) NOT NULL,              -- instagram | tiktok
  tipo VARCHAR(20),                       -- post | reel | video | story
  titulo VARCHAR(200),
  caption TEXT,
  hashtags TEXT,
  media_url TEXT,                         -- URL de la imagen/video
  post_id VARCHAR(100),                   -- ID de la publicación en la red
  estado VARCHAR(20) DEFAULT 'borrador', -- borrador | programada | publicado | error
  fecha_programada TIMESTAMP,
  fecha_publicado TIMESTAMP,
  metricas JSONB DEFAULT '{}'::jsonb,    -- likes, comments, views, etc.
  error_mensaje TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_red ON publicaciones_redes(red, fecha_publicado DESC);
CREATE INDEX IF NOT EXISTS idx_pub_estado ON publicaciones_redes(estado);
CREATE INDEX IF NOT EXISTS idx_pub_producto ON publicaciones_redes(producto_id);

-- ============================================================
-- 9. PLANTILLAS DE MENSAJES
-- ============================================================
CREATE TABLE IF NOT EXISTS plantillas_mensajes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  canal VARCHAR(20) NOT NULL,            -- whatsapp | email | instagram
  categoria VARCHAR(50),                  -- promocion | saludo | recordatorio | postventa
  contenido TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,   -- ["nombre", "producto", "precio"]
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. PLANTILLAS DE EJEMPLO
-- ============================================================
INSERT INTO plantillas_mensajes (nombre, canal, categoria, contenido, variables) VALUES
  (
    'Saludo cumpleaños',
    'whatsapp',
    'saludo',
    '¡Feliz cumpleaños {{nombre}}! 🎉 De parte de todo el equipo de Ferretería. Te esperamos con un 10% de descuento esta semana.',
    '["nombre"]'::jsonb
  ),
  (
    'Promoción general',
    'whatsapp',
    'promocion',
    'Hola {{nombre}}! 👋 Tenemos una promo especial en {{producto}} con {{descuento}}% de descuento. ¿Te interesa?',
    '["nombre", "producto", "descuento"]'::jsonb
  ),
  (
    'Recordatorio de pago',
    'whatsapp',
    'recordatorio',
    'Hola {{nombre}}, te recordamos que tenés un saldo pendiente de ${{saldo}}. Podés pasar por el local cuando quieras.',
    '["nombre", "saldo"]'::jsonb
  ),
  (
    'Cliente inactivo',
    'whatsapp',
    'promocion',
    'Hola {{nombre}}! Hace un tiempo no te vemos por la ferretería. Te dejamos un 15% en tu próxima compra para que vuelvas a visitarnos 🔧',
    '["nombre"]'::jsonb
  ),
  (
    'Post-venta',
    'whatsapp',
    'postventa',
    'Hola {{nombre}}, gracias por tu compra! Si necesitás algo más o tenés alguna duda con el producto, estamos a disposición.',
    '["nombre"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. VISTA DE CLIENTES CON SEGMENTACIÓN
-- ============================================================
CREATE OR REPLACE VIEW v_clientes_segmentados AS
SELECT
  c.*,
  COALESCE(v.total_comprado, 0) AS total_comprado,
  COALESCE(v.cantidad_compras, 0) AS cantidad_compras,
  v.ultima_compra,
  v.ticket_promedio,
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
  WHERE estado = 'completada'
  GROUP BY cliente_id
) v ON v.cliente_id = c.id;

COMMENT ON VIEW v_clientes_segmentados IS 'Clientes con segmentación automática por actividad y valor';

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================