import { Router } from 'express';
import * as ctrl from '../controllers/ventas.controller.js';
import { verificarToken, rolesPermitidos } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// RUTAS ESPECIALES (van PRIMERO para que no las capture /:id)
// ============================================================

// Estadísticas (solo admin)
router.get('/estadisticas/resumen',
  verificarToken, rolesPermitidos('admin'),
  ctrl.resumen
);
router.get('/estadisticas/forma-pago',
  verificarToken, rolesPermitidos('admin'),
  ctrl.resumenPorFormaPago
);
router.get('/estadisticas/vendedor',
  verificarToken, rolesPermitidos('admin'),
  ctrl.resumenPorVendedor
);
router.get('/estadisticas/top-productos',
  verificarToken, rolesPermitidos('admin'),
  ctrl.topProductos
);

// ============================================================
// CRUD DE VENTAS
// ============================================================

// Listar ventas (admin ve todas, vendedor ve solo las suyas por filtro en controller)
router.get('/',
  verificarToken,
  ctrl.listar
);

// Ver detalle
router.get('/:id',
  verificarToken,
  ctrl.ver
);

// Registrar venta (admin y vendedor)
router.post('/',
  verificarToken,
  rolesPermitidos('admin', 'vendedor'),
  ctrl.registrar
);

// Anular venta (solo admin)
router.post('/:id/anular',
  verificarToken,
  rolesPermitidos('admin'),
  ctrl.anular
);

export default router;