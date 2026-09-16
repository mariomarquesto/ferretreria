import { KpisService } from '../services/kpis.service.js';
import { MovimientoStock } from '../models/MovimientoStock.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

export const dashboard = asyncHandler(async (req, res) => {
  res.json(await KpisService.dashboard());
});

export const rentabilidad = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await KpisService.rentabilidad({ desde, hasta }));
});

export const utilidadPorProducto = asyncHandler(async (req, res) => {
  const { desde, hasta, limit } = req.query;
  res.json(await KpisService.utilidadPorProducto({
    desde,
    hasta,
    limit: limit ? Number(limit) : 50
  }));
});

export const flujoCaja = asyncHandler(async (req, res) => {
  res.json(await KpisService.flujoCaja());
});

export const rankingVendedores = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  res.json(await KpisService.rankingVendedores({ desde, hasta }));
});

export const kardexProducto = asyncHandler(async (req, res) => {
  res.json(await MovimientoStock.kardexDeProducto(req.params.id, { limit: 200 }));
});

export const refrescarVistas = asyncHandler(async (req, res) => {
  res.json(await KpisService.refrescarVistas());
});