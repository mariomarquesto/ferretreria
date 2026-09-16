import { Marca } from '../models/Marca.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

export const listar = asyncHandler(async (req, res) => {
  res.json(await Marca.findAllWithCount());
});

export const ver = asyncHandler(async (req, res) => {
  const m = await Marca.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'Marca no encontrada' });
  res.json(m);
});

export const crear = asyncHandler(async (req, res) => {
  if (!req.body.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const nueva = await Marca.create(req.body);
  res.status(201).json(nueva);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizada = await Marca.update(req.params.id, req.body);
  if (!actualizada) return res.status(404).json({ error: 'Marca no encontrada' });
  res.json(actualizada);
});

export const eliminar = asyncHandler(async (req, res) => {
  const ok = await Marca.softDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Marca no encontrada' });
  res.json({ ok: true });
});