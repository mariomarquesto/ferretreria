import { Producto } from '../models/Producto.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

export const listar = asyncHandler(async (req, res) => {
  const { search, categoria_id, marca_id, limit, offset, todos } = req.query;
  const productos = await Producto.findAllDetailed({
    search,
    categoria_id: categoria_id ? Number(categoria_id) : undefined,
    marca_id: marca_id ? Number(marca_id) : undefined,
    soloActivos: todos !== 'true',
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0
  });
  res.json(productos);
});

export const ver = asyncHandler(async (req, res) => {
  const p = await Producto.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

export const crear = asyncHandler(async (req, res) => {
  const nuevo = await Producto.create(req.body);
  res.status(201).json(nuevo);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizado = await Producto.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(actualizado);
});

export const eliminar = asyncHandler(async (req, res) => {
  const ok = await Producto.softDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ ok: true });
});

export const stockBajo = asyncHandler(async (req, res) => {
  res.json(await Producto.stockBajo());
});