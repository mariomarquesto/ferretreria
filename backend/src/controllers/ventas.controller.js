import { Venta } from '../models/Venta.js';
import { VentasService } from '../services/ventas.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * GET /api/ventas
 * Query: desde, hasta, cliente_id, usuario_id, estado, limit, offset
 */
export const listar = asyncHandler(async (req, res) => {
  const { desde, hasta, cliente_id, usuario_id, estado, limit, offset } = req.query;
  const ventas = await Venta.listar({
    desde,
    hasta,
    cliente_id: cliente_id ? Number(cliente_id) : undefined,
    usuario_id: usuario_id ? Number(usuario_id) : undefined,
    estado,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0
  });
  res.json(ventas);
});

/**
 * GET /api/ventas/:id
 */
export const ver = asyncHandler(async (req, res) => {
  const venta = await Venta.findDetailed(req.params.id);
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
  res.json(venta);
});

/**
 * POST /api/ventas
 * Body:
 * {
 *   cliente_id: 1 | null,
 *   forma_pago: "efectivo" | "debito" | "credito" | "transferencia" | "cta_cte",
 *   descuento: 0,
 *   canal: "pos" | "online" | "telefono",
 *   observaciones: "...",
 *   items: [
 *     { producto_id: 1, cantidad: 2 },
 *     ...
 *   ]
 * }
 */
export const registrar = asyncHandler(async (req, res) => {
  const usuario_id = req.user?.id || null;
  const caja_id = req.body.caja_id || null;

  const venta = await VentasService.registrar(req.body, usuario_id, caja_id);
  res.status(201).json(venta);
});

/**
 * POST /api/ventas/:id/anular
 */
export const anular = asyncHandler(async (req, res) => {
  const usuario_id = req.user?.id || null;
  const motivo = req.body?.motivo || 'anulación manual';
  const venta = await VentasService.anular(req.params.id, usuario_id, motivo);
  res.json(venta);
});

/**
 * GET /api/ventas/estadisticas/resumen
 */
export const resumen = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await Venta.resumen({ desde, hasta }));
});

/**
 * GET /api/ventas/estadisticas/forma-pago
 */
export const resumenPorFormaPago = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await Venta.resumenPorFormaPago({ desde, hasta }));
});

/**
 * GET /api/ventas/estadisticas/vendedor
 */
export const resumenPorVendedor = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await Venta.resumenPorVendedor({ desde, hasta }));
});

/**
 * GET /api/ventas/estadisticas/top-productos
 */
export const topProductos = asyncHandler(async (req, res) => {
  const { desde, hasta, limit } = req.query;
  res.json(await Venta.topProductos({
    desde,
    hasta,
    limit: limit ? Number(limit) : 10
  }));
});