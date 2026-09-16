import { Gasto } from '../models/Gasto.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { pool } from '../config/db.js';

/**
 * GET /api/gastos
 * Query: desde, hasta, tipo_id, limit, offset
 */
export const listar = asyncHandler(async (req, res) => {
  const { desde, hasta, tipo_id, limit, offset } = req.query;
  const gastos = await Gasto.listar({
    desde,
    hasta,
    tipo_id: tipo_id ? Number(tipo_id) : undefined,
    limit: limit ? Number(limit) : 200,
    offset: offset ? Number(offset) : 0
  });
  res.json(gastos);
});

/**
 * GET /api/gastos/:id
 */
export const ver = asyncHandler(async (req, res) => {
  const g = await Gasto.findDetailed(req.params.id);
  if (!g) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json(g);
});

/**
 * POST /api/gastos
 * Body: { tipo_id, descripcion, monto, fecha?, comprobante_url?, recurrente?, periodo? }
 */
export const crear = asyncHandler(async (req, res) => {
  const { tipo_id, descripcion, monto } = req.body;

  if (!tipo_id) return res.status(400).json({ error: 'tipo_id es obligatorio' });
  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'monto debe ser mayor a 0' });
  }

  const data = {
    ...req.body,
    monto: Number(req.body.monto),
    usuario_id: req.user?.id || null
  };

  const nuevo = await Gasto.create(data);
  res.status(201).json(nuevo);
});

/**
 * PUT /api/gastos/:id
 */
export const actualizar = asyncHandler(async (req, res) => {
  if (req.body.monto !== undefined && Number(req.body.monto) <= 0) {
    return res.status(400).json({ error: 'monto debe ser mayor a 0' });
  }

  const actualizado = await Gasto.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json(actualizado);
});

/**
 * DELETE /api/gastos/:id
 * Los gastos se pueden borrar físicamente (no tienen historial crítico).
 */
export const eliminar = asyncHandler(async (req, res) => {
  const ok = await Gasto.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ ok: true });
});

/**
 * GET /api/gastos/estadisticas/tipos
 */
export const totalPorTipo = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await Gasto.totalPorTipo({ desde, hasta }));
});

/**
 * GET /api/gastos/estadisticas/mensual
 */
export const totalPorMes = asyncHandler(async (req, res) => {
  res.json(await Gasto.totalPorMes());
});

/**
 * GET /api/gastos/tipos
 * Devuelve el catálogo de tipos de gasto (para poblar un select en el front).
 */
export const listarTipos = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM tipos_gasto WHERE activo = TRUE ORDER BY nombre'
  );
  res.json(rows);
});

/**
 * POST /api/gastos/tipos
 * Crea un tipo de gasto nuevo.
 */
export const crearTipo = asyncHandler(async (req, res) => {
  const { nombre, categoria } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const { rows } = await pool.query(
    'INSERT INTO tipos_gasto (nombre, categoria) VALUES ($1, $2) RETURNING *',
    [nombre, categoria || null]
  );
  res.status(201).json(rows[0]);
});

/**
 * GET /api/gastos/resumen
 * Resumen rápido: total del mes, total del año, promedio mensual.
 */
export const resumen = asyncHandler(async (req, res) => {
  const { rows: [mesActual] } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0)::numeric AS total, COUNT(*)::int AS cantidad
    FROM gastos
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  const { rows: [mesAnterior] } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0)::numeric AS total
    FROM gastos
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND fecha < DATE_TRUNC('month', CURRENT_DATE)
  `);

  const { rows: [anioActual] } = await pool.query(`
    SELECT COALESCE(SUM(monto), 0)::numeric AS total, COUNT(*)::int AS cantidad
    FROM gastos
    WHERE fecha >= DATE_TRUNC('year', CURRENT_DATE)
  `);

  const variacion = Number(mesAnterior.total) > 0
    ? ((Number(mesActual.total) - Number(mesAnterior.total)) / Number(mesAnterior.total)) * 100
    : 0;

  res.json({
    mes_actual: mesActual,
    mes_anterior: mesAnterior,
    anio_actual: anioActual,
    variacion_pct: Number(variacion.toFixed(2))
  });
});