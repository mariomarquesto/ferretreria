-- ==========================================================
-- ROLES Y USUARIOS
-- ==========================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  permisos JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INT REFERENCES roles(id) ON DELETE SET NULL,
  telefono VARCHAR(30),
  direccion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- CATÁLOGO
-- ==========================================================
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  padre_id INT REFERENCES categorias(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marcas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS unidades_medida (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  codigo_barras VARCHAR(80) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
  marca_id INT REFERENCES marcas(id) ON DELETE SET NULL,
  unidad_id INT REFERENCES unidades_medida(id) ON DELETE SET NULL,
  precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  precio_venta DECIMAL(12,2) NOT NULL CHECK (precio_venta >= 0),
  iva DECIMAL(5,2) DEFAULT 21,
  stock INT DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INT DEFAULT 5,
  stock_maximo INT DEFAULT 100,
  ubicacion VARCHAR(100),
  imagen_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- PROVEEDORES Y CLIENTES
-- ==========================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  cuit VARCHAR(20),
  telefono VARCHAR(30),
  email VARCHAR(120),
  direccion TEXT,
  contacto VARCHAR(120),
  saldo DECIMAL(12,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre VARCHAR(150) NOT NULL,
  cuit_dni VARCHAR(20),
  telefono VARCHAR(30),
  email VARCHAR(120),
  direccion TEXT,
  saldo DECIMAL(12,2) DEFAULT 0,
  limite_credito DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- COMPRAS
-- ==========================================================
CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE,
  proveedor_id INT REFERENCES proveedores(id) ON DELETE SET NULL,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMP DEFAULT NOW(),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','recibida','pagada','anulada')),
  forma_pago VARCHAR(30),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_compra (
  id SERIAL PRIMARY KEY,
  compra_id INT REFERENCES compras(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

-- ==========================================================
-- VENTAS Y CAJAS
-- ==========================================================
CREATE TABLE IF NOT EXISTS cajas (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_apertura TIMESTAMP DEFAULT NOW(),
  fecha_cierre TIMESTAMP,
  monto_inicial DECIMAL(12,2) DEFAULT 0,
  monto_final DECIMAL(12,2),
  estado VARCHAR(20) DEFAULT 'abierta'
    CHECK (estado IN ('abierta','cerrada')),
  observaciones TEXT
);

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE,
  cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  caja_id INT REFERENCES cajas(id) ON DELETE SET NULL,
  fecha TIMESTAMP DEFAULT NOW(),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) DEFAULT 0,
  iva DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_total DECIMAL(12,2) DEFAULT 0,
  ganancia DECIMAL(12,2) GENERATED ALWAYS AS (total - costo_total) STORED,
  forma_pago VARCHAR(30),
  estado VARCHAR(20) DEFAULT 'completada'
    CHECK (estado IN ('pendiente','completada','anulada')),
  canal VARCHAR(20) DEFAULT 'pos'
    CHECK (canal IN ('pos','online','telefono')),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id SERIAL PRIMARY KEY,
  venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(12,2) NOT NULL,
  costo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pagos_venta (
  id SERIAL PRIMARY KEY,
  venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL,
  metodo VARCHAR(30),
  fecha TIMESTAMP DEFAULT NOW(),
  referencia VARCHAR(100)
);

-- ==========================================================
-- GASTOS
-- ==========================================================
CREATE TABLE IF NOT EXISTS tipos_gasto (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  categoria VARCHAR(50)
    CHECK (categoria IN ('fijo','variable','impuesto')),
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gastos (
  id SERIAL PRIMARY KEY,
  tipo_id INT REFERENCES tipos_gasto(id) ON DELETE SET NULL,
  descripcion VARCHAR(200),
  monto DECIMAL(12,2) NOT NULL CHECK (monto >= 0),
  fecha TIMESTAMP DEFAULT NOW(),
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  comprobante_url TEXT,
  recurrente BOOLEAN DEFAULT FALSE,
  periodo VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- KARDEX (movimientos de stock)
-- ==========================================================
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id SERIAL PRIMARY KEY,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('entrada','salida','ajuste','devolucion','perdida')),
  motivo VARCHAR(80),
  referencia_id INT,
  referencia_tipo VARCHAR(20),
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_posterior INT NOT NULL,
  costo_unitario DECIMAL(12,2),
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- ALERTAS
-- ==========================================================
CREATE TABLE IF NOT EXISTS alertas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(40),
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  mensaje TEXT,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);