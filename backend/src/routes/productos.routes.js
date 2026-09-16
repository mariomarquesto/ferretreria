import { Router } from 'express';
import * as ctrl from '../controllers/productos.controller.js';

const router = Router();

// Rutas públicas por ahora (después protegemos)
router.get('/', ctrl.listar);
router.get('/stock-bajo', ctrl.stockBajo);
router.get('/:id', ctrl.ver);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

export default router;