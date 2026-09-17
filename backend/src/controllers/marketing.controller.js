import { pool } from '../config/db.js';
import { SegmentacionService } from '../services/marketing/segmentacion.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

// ============================================================
// DASHBOARD DEL CRM
// ============================================================

/**
 * GET /api/marketing/dashboard
 * Resumen general del CRM
 */
export const dashboard = asyncHandler(async (req, res) => {
  // 1. Resumen de segmentos
  const segmentos = await SegmentacionService.resumenSegmentos();

  // 2. Tareas pendientes
  const { rows: [tareas] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
      COUNT(*) FILTER (WHERE estado = 'pendiente' AND fecha_programada < NOW())::int AS vencidas,
      COUNT(*) FILTER (WHERE estado = 'pendiente' AND fecha_programada::date = CURRENT_DATE)::int AS hoy
    FROM cliente_tareas
  `);

  // 3. Últimas comunicaciones
  const { rows: [comunicaciones] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS esta_semana,
      COUNT(*) FILTER (WHERE direccion = 'recibido' AND created_at >= NOW() - INTERVAL '7 days')::int AS recibidas,
      COUNT(*) FILTER (WHERE direccion = 'enviado' AND created_at >= NOW() - INTERVAL '7 days')::int AS enviadas
    FROM cliente_comunicaciones
  `);

  // 4. Top 10 clientes
  const { rows: topClientes } = await pool.query(`
    SELECT
      c.id, c.nombre, c.email, c.telefono,
      COUNT(v.id)::int AS compras,
      SUM(v.total)::numeric AS total_comprado
    FROM clientes c
    JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
    GROUP BY c.id
    ORDER BY total_comprado DESC
    LIMIT 10
  `);

  // 5. Clientes a contactar (inactivos con compras previas)
  const { rows: aContactar } = await pool.query(`
    SELECT
      c.id, c.nombre, c.telefono,
      MAX(v.fecha) AS ultima_compra,
      EXTRACT(DAY FROM NOW() - MAX(v.fecha))::int AS dias_sin_comprar
    FROM clientes c
    JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
    GROUP BY c.id
    HAVING MAX(v.fecha) < NOW() - INTERVAL '60 days'
    ORDER BY MAX(v.fecha) ASC
    LIMIT 10
  `);

  res.json({
    segmentos,
    tareas,
    comunicaciones,
    topClientes,
    aContactar
  });
});

// ============================================================
// CLIENTES
// ============================================================

/**
 * GET /api/marketing/clientes
 */
export const listarClientes = asyncHandler(async (req, res) => {
  const { search, segmento, tipo_cliente, limit, offset } = req.query;
  const clientes = await SegmentacionService.listarConSegmentos({
    search,
    segmento,
    tipo_cliente,
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0
  });
  res.json(clientes);
});

/**
 * GET /api/marketing/clientes/:id
 * Ficha completa del cliente
 */
export const verCliente = asyncHandler(async (req, res) => {
  const cliente = await SegmentacionService.fichaCompleta(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
});

/**
 * PUT /api/marketing/clientes/:id
 * Actualizar datos del cliente (tipo, etiquetas, notas, etc.)
 */
export const actualizarCliente = asyncHandler(async (req, res) => {
  const camposPermitidos = [
    'nombre', 'email', 'telefono', 'direccion', 'cuit_dni',
    'tipo_cliente', 'etiquetas', 'fecha_nacimiento', 'avatar_url',
    'notas', 'canal_preferido', 'instagram', 'facebook',
    'vendedor_asignado_id', 'limite_credito'
  ];

  const campos = Object.keys(req.body).filter((k) => camposPermitidos.includes(k));
  if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  const sets = campos.map((c, i) => `${c} = $${i + 1}`);
  const values = [...campos.map((c) => req.body[c]), req.params.id];

  const { rows } = await pool.query(`
    UPDATE clientes SET ${sets.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `, values);

  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(rows[0]);
});

/**
 * POST /api/marketing/clientes/:id/notas
 * Agregar nota rápida al cliente
 */
export const agregarNota = asyncHandler(async (req, res) => {
  const { nota } = req.body;
  if (!nota) return res.status(400).json({ error: 'Nota vacía' });

  const fecha = new Date().toISOString();
  const { rows: [cliente] } = await pool.query(
    'SELECT notas FROM clientes WHERE id = $1',
    [req.params.id]
  );

  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const notasActuales = cliente.notas || '';
  const notasNuevas = `${notasActuales}\n\n[${fecha}] ${nota}`.trim();

  await pool.query(
    'UPDATE clientes SET notas = $1 WHERE id = $2',
    [notasNuevas, req.params.id]
  );

  res.json({ ok: true, notas: notasNuevas });
});

// ============================================================
// TAREAS
// ============================================================

/**
 * GET /api/marketing/tareas
 */
export const listarTareas = asyncHandler(async (req, res) => {
  const { estado, prioridad, cliente_id, usuario_id, solo_hoy } = req.query;
  const cond = [];
  const params = [];

  if (estado) { params.push(estado); cond.push(`t.estado = $${params.length}`); }
  if (prioridad) { params.push(prioridad); cond.push(`t.prioridad = $${params.length}`); }
  if (cliente_id) { params.push(cliente_id); cond.push(`t.cliente_id = $${params.length}`); }
  if (usuario_id) { params.push(usuario_id); cond.push(`t.usuario_id = $${params.length}`); }
  if (solo_hoy === 'true') {
    cond.push(`t.fecha_programada::date = CURRENT_DATE`);
  }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      t.*,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono,
      u.nombre AS usuario_nombre
    FROM cliente_tareas t
    LEFT JOIN clientes c ON c.id = t.cliente_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    ${where}
    ORDER BY
      CASE
        WHEN t.estado = 'pendiente' AND t.fecha_programada < NOW() THEN 0
        WHEN t.estado = 'pendiente' AND t.fecha_programada::date = CURRENT_DATE THEN 1
        WHEN t.estado = 'pendiente' THEN 2
        ELSE 3
      END,
      CASE t.prioridad
        WHEN 'urgente' THEN 0
        WHEN 'alta' THEN 1
        WHEN 'media' THEN 2
        ELSE 3
      END,
      t.fecha_programada ASC NULLS LAST
    LIMIT 200
  `, params);

  res.json(rows);
});

/**
 * POST /api/marketing/tareas
 */
export const crearTarea = asyncHandler(async (req, res) => {
  const { cliente_id, titulo, descripcion, fecha_programada, prioridad } = req.body;

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'Título obligatorio' });
  }

  const { rows: [tarea] } = await pool.query(`
    INSERT INTO cliente_tareas
      (cliente_id, titulo, descripcion, fecha_programada, prioridad, usuario_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    cliente_id || null,
    titulo,
    descripcion || null,
    fecha_programada || null,
    prioridad || 'media',
    req.user?.id || null
  ]);

  res.status(201).json(tarea);
});

/**
 * PUT /api/marketing/tareas/:id
 */
export const actualizarTarea = asyncHandler(async (req, res) => {
  const campos = ['titulo', 'descripcion', 'fecha_programada', 'prioridad', 'estado'];
  const updates = Object.keys(req.body).filter((k) => campos.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  const sets = updates.map((c, i) => `${c} = $${i + 1}`);
  const values = [...updates.map((c) => req.body[c]), req.params.id];

  // Si marca como completada, guardar fecha
  let extra = '';
  if (req.body.estado === 'completada') {
    sets.push(`completed_at = NOW()`);
  }

  const { rows } = await pool.query(`
    UPDATE cliente_tareas SET ${sets.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `, values);

  if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(rows[0]);
});

/**
 * DELETE /api/marketing/tareas/:id
 */
export const eliminarTarea = asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM cliente_tareas WHERE id = $1',
    [req.params.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json({ ok: true });
});

/**
 * PUT /api/marketing/tareas/:id/completar
 * Marcar tarea como completada
 */
export const completarTarea = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    UPDATE cliente_tareas
    SET estado = 'completada', completed_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [req.params.id]);

  if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(rows[0]);
});

// ============================================================
// COMUNICACIONES
// ============================================================

/**
 * GET /api/marketing/comunicaciones
 */
export const listarComunicaciones = asyncHandler(async (req, res) => {
  const { cliente_id, canal, limit = 100 } = req.query;
  const cond = [];
  const params = [];

  if (cliente_id) { params.push(cliente_id); cond.push(`cliente_id = $${params.length}`); }
  if (canal) { params.push(canal); cond.push(`canal = $${params.length}`); }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  params.push(limit);

  const { rows } = await pool.query(`
    SELECT cc.*, c.nombre AS cliente_nombre
    FROM cliente_comunicaciones cc
    LEFT JOIN clientes c ON c.id = cc.cliente_id
    ${where}
    ORDER BY cc.created_at DESC
    LIMIT $${params.length}
  `, params);

  res.json(rows);
});

/**
 * POST /api/marketing/comunicaciones
 * Registrar comunicación manual (llamada, visita, etc.)
 */
export const registrarComunicacion = asyncHandler(async (req, res) => {
  const { cliente_id, canal, direccion, mensaje } = req.body;

  if (!cliente_id || !canal) {
    return res.status(400).json({ error: 'Cliente y canal son obligatorios' });
  }

  const { rows: [com] } = await pool.query(`
    INSERT INTO cliente_comunicaciones
      (cliente_id, canal, direccion, tipo, mensaje, usuario_id, estado)
    VALUES ($1, $2, $3, 'texto', $4, $5, 'enviado')
    RETURNING *
  `, [
    cliente_id,
    canal,
    direccion || 'enviado',
    mensaje || null,
    req.user?.id || null
  ]);

  res.status(201).json(com);
});

// ============================================================
// PLANTILLAS DE MENSAJES
// ============================================================

/**
 * GET /api/marketing/plantillas
 */
export const listarPlantillas = asyncHandler(async (req, res) => {
  const { canal, categoria } = req.query;
  const cond = ['activo = TRUE'];
  const params = [];

  if (canal) { params.push(canal); cond.push(`canal = $${params.length}`); }
  if (categoria) { params.push(categoria); cond.push(`categoria = $${params.length}`); }

  const { rows } = await pool.query(`
    SELECT * FROM plantillas_mensajes
    WHERE ${cond.join(' AND ')}
    ORDER BY categoria, nombre
  `, params);

  res.json(rows);
});

/**
 * POST /api/marketing/plantillas
 */
export const crearPlantilla = asyncHandler(async (req, res) => {
  const { nombre, canal, categoria, contenido, variables } = req.body;

  if (!nombre || !canal || !contenido) {
    return res.status(400).json({ error: 'Nombre, canal y contenido son obligatorios' });
  }

  const { rows: [plantilla] } = await pool.query(`
    INSERT INTO plantillas_mensajes
      (nombre, canal, categoria, contenido, variables)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [nombre, canal, categoria || null, contenido, JSON.stringify(variables || [])]);

  res.status(201).json(plantilla);
});

/**
 * DELETE /api/marketing/plantillas/:id
 */
export const eliminarPlantilla = asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    'UPDATE plantillas_mensajes SET activo = FALSE WHERE id = $1',
    [req.params.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json({ ok: true });
});