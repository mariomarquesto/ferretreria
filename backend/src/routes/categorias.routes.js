import { Router } from 'express';
import * as ctrl from '../controllers/categorias.controller.js';

const router = Router();

// Públicas (para la tienda)
router.get('/', ctrl.listar);
router.get('/:id', ctrl.ver);

// Escritura (después protegemos con auth)
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

export default router;