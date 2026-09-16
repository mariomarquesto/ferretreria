import { Proveedor } from '../models/Proveedor.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

export const listar = asyncHandler(async (req, res) => {
  const { search, limit, offset } = req.query;
  res.json(await Proveedor.listar({
    search,
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0
  }));
});

export const ver = asyncHandler(async (req, res) => {
  const p = await Proveedor.findDetailed(req.params.id);
  if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(p);
});

export const crear = asyncHandler(async (req, res) => {
  if (!req.body.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const existe = await Proveedor.findByNombre(req.body.nombre);
  if (existe) return res.status(409).json({ error: 'Ya existe un proveedor con ese nombre' });

  res.status(201).json(await Proveedor.create(req.body));
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizado = await Proveedor.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(actualizado);
});

export const eliminar = asyncHandler(async (req, res) => {
  const ok = await Proveedor.softDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json({ ok: true });
});