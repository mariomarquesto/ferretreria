import { Router } from 'express';
import * as ctrl from '../controllers/reportes.controller.js';

const router = Router();

router.get('/dashboard', ctrl.dashboard);
router.get('/rentabilidad', ctrl.rentabilidad);
router.get('/utilidad-productos', ctrl.utilidadPorProducto);
router.get('/flujo-caja', ctrl.flujoCaja);
router.get('/ranking-vendedores', ctrl.rankingVendedores);
router.get('/kardex/:id', ctrl.kardexProducto);
router.post('/refrescar-vistas', ctrl.refrescarVistas);

export default router;