import { Router } from 'express';
import * as ctrl from '../controllers/clientes.controller.js';

const router = Router();

// ⚠️ Rutas especiales primero, para que no las capture '/:id'
router.get('/top', ctrl.top);

// CRUD
router.get('/', ctrl.listar);
router.get('/:id', ctrl.ver);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

export default router;