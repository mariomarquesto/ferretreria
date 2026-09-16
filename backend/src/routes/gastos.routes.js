import { Router } from 'express';
import * as ctrl from '../controllers/gastos.controller.js';

const router = Router();

// ⚠️ Rutas especiales primero
router.get('/tipos', ctrl.listarTipos);
router.post('/tipos', ctrl.crearTipo);
router.get('/estadisticas/tipos', ctrl.totalPorTipo);
router.get('/estadisticas/mensual', ctrl.totalPorMes);
router.get('/resumen', ctrl.resumen);

// CRUD
router.get('/', ctrl.listar);
router.get('/:id', ctrl.ver);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

export default router;