import { Categoria } from '../models/Categoria.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/categorias
 * Devuelve todas las categorías con la cantidad de productos activos.
 */
export const listar = asyncHandler(async (req, res) => {
  res.json(await Categoria.findAllWithCount());
});

/**
 * GET /api/categorias/:id
 */
export const ver = asyncHandler(async (req, res) => {
  const cat = await Categoria.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(cat);
});

/**
 * POST /api/categorias
 */
export const crear = asyncHandler(async (req, res) => {
  const nueva = await Categoria.create(req.body);
  res.status(201).json(nueva);
});

/**
 * PUT /api/categorias/:id
 */
export const actualizar = asyncHandler(async (req, res) => {
  const actualizada = await Categoria.update(req.params.id, req.body);
  if (!actualizada) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(actualizada);
});

/**
 * DELETE /api/categorias/:id
 * Soft delete: marca activo = FALSE.
 */
export const eliminar = asyncHandler(async (req, res) => {
  const ok = await Categoria.softDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json({ ok: true });
});