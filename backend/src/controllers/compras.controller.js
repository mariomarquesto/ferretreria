import { Compra } from '../models/Compra.js';
import { ComprasService } from '../services/compras.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/compras
 */
export const listar = asyncHandler(async (req, res) => {
  const { desde, hasta, proveedor_id, estado, limit, offset } = req.query;
  const compras = await Compra.listar({
    desde,
    hasta,
    proveedor_id: proveedor_id ? Number(proveedor_id) : undefined,
    estado,
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0
  });
  res.json(compras);
});

/**
 * GET /api/compras/:id
 */
export const ver = asyncHandler(async (req, res) => {
  const compra = await Compra.findDetailed(req.params.id);
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json(compra);
});

/**
 * POST /api/compras
 * Body esperado:
 * {
 *   proveedor_id: 1,
 *   forma_pago: "transferencia",
 *   observaciones: "...",
 *   estado: "recibida" | "pendiente",
 *   items: [
 *     { producto_id: 1, cantidad: 10, precio_unitario: 1500.50 },
 *     ...
 *   ]
 * }
 */
export const registrar = asyncHandler(async (req, res) => {
  const usuario_id = req.user?.id || null;
  const compra = await ComprasService.registrar(req.body, usuario_id);
  res.status(201).json(compra);
});

/**
 * POST /api/compras/:id/anular
 */
export const anular = asyncHandler(async (req, res) => {
  const usuario_id = req.user?.id || null;
  const compra = await ComprasService.anular(req.params.id, usuario_id);
  res.json(compra);
});

/**
 * POST /api/compras/:id/pagar
 */
export const pagar = asyncHandler(async (req, res) => {
  const compra = await ComprasService.marcarPagada(req.params.id);
  res.json(compra);
});

/**
 * GET /api/compras/resumen/proveedores
 */
export const resumenPorProveedor = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await Compra.resumenPorProveedor({ desde, hasta }));
});