import { Cliente } from '../models/Cliente.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/clientes
 * Query params: search, limit, offset
 */
export const listar = asyncHandler(async (req, res) => {
  const { search, limit, offset } = req.query;
  const clientes = await Cliente.listar({
    search,
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0
  });
  res.json(clientes);
});

/**
 * GET /api/clientes/:id
 * Detalle con últimas ventas.
 */
export const ver = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findDetailed(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
});

/**
 * POST /api/clientes
 */
export const crear = asyncHandler(async (req, res) => {
  const { nombre, email, cuit_dni } = req.body;

  if (!nombre || nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  // Prevenir duplicados por email
  if (email) {
    const existe = await Cliente.findByEmail(email);
    if (existe) {
      return res.status(409).json({
        error: 'Ya existe un cliente con ese email',
        cliente_id: existe.id
      });
    }
  }

  // Prevenir duplicados por CUIT/DNI
  if (cuit_dni) {
    const existe = await Cliente.findByCuit(cuit_dni);
    if (existe) {
      return res.status(409).json({
        error: 'Ya existe un cliente con ese CUIT/DNI',
        cliente_id: existe.id
      });
    }
  }

  const nuevo = await Cliente.create(req.body);
  res.status(201).json(nuevo);
});

/**
 * PUT /api/clientes/:id
 */
export const actualizar = asyncHandler(async (req, res) => {
  // Si está cambiando el email, verificar que no choque con otro cliente
  if (req.body.email) {
    const existe = await Cliente.findByEmail(req.body.email);
    if (existe && String(existe.id) !== String(req.params.id)) {
      return res.status(409).json({ error: 'Ya existe otro cliente con ese email' });
    }
  }

  // Si está cambiando el CUIT/DNI, verificar que no choque
  if (req.body.cuit_dni) {
    const existe = await Cliente.findByCuit(req.body.cuit_dni);
    if (existe && String(existe.id) !== String(req.params.id)) {
      return res.status(409).json({ error: 'Ya existe otro cliente con ese CUIT/DNI' });
    }
  }

  const actualizado = await Cliente.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(actualizado);
});

/**
 * DELETE /api/clientes/:id
 * Elimina físicamente si no tiene ventas asociadas; si las tiene, devuelve error.
 */
export const eliminar = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    const ok = await Cliente.delete(req.params.id);
    res.json({ ok });
  } catch (err) {
    // FK constraint: cliente tiene ventas asociadas
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: el cliente tiene ventas registradas',
        hint: 'Podés mantenerlo pero desactivar su cuenta desde el campo activo'
      });
    }
    throw err;
  }
});

/**
 * GET /api/clientes/top
 * Top clientes por facturación.
 */
export const top = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  res.json(await Cliente.top({ limit: limit ? Number(limit) : 10 }));
});