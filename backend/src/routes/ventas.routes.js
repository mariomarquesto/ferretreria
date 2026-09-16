import { Router } from 'express';
import * as ctrl from '../controllers/ventas.controller.js';

const router = Router();

// ⚠️ Rutas especiales primero
router.get('/estadisticas/resumen', ctrl.resumen);
router.get('/estadisticas/forma-pago', ctrl.resumenPorFormaPago);
router.get('/estadisticas/vendedor', ctrl.resumenPorVendedor);
router.get('/estadisticas/top-productos', ctrl.topProductos);

// CRUD
router.get('/', ctrl.listar);
router.get('/:id', ctrl.ver);
router.post('/', ctrl.registrar);
router.post('/:id/anular', ctrl.anular);

export default router;