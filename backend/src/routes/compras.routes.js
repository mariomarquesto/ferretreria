import { Router } from 'express';
import * as ctrl from '../controllers/compras.controller.js';

const router = Router();

// ⚠️ Rutas especiales primero
router.get('/resumen/proveedores', ctrl.resumenPorProveedor);

// CRUD
router.get('/', ctrl.listar);
router.get('/:id', ctrl.ver);
router.post('/', ctrl.registrar);
router.post('/:id/anular', ctrl.anular);
router.post('/:id/pagar', ctrl.pagar);

export default router;