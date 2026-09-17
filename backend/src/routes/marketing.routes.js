import { Router } from 'express';
import * as ctrl from '../controllers/marketing.controller.js';
import { verificarToken, rolesPermitidos } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
// Solo admin y vendedores pueden acceder al CRM
router.use(verificarToken, rolesPermitidos('admin', 'vendedor'));

// ============================================================
// DASHBOARD
// ============================================================
router.get('/dashboard', ctrl.dashboard);

// ============================================================
// CLIENTES
// ============================================================
router.get('/clientes', ctrl.listarClientes);
router.get('/clientes/:id', ctrl.verCliente);
router.put('/clientes/:id', ctrl.actualizarCliente);
router.post('/clientes/:id/notas', ctrl.agregarNota);

// ============================================================
// TAREAS
// ============================================================
router.get('/tareas', ctrl.listarTareas);
router.post('/tareas', ctrl.crearTarea);
router.put('/tareas/:id', ctrl.actualizarTarea);
router.put('/tareas/:id/completar', ctrl.completarTarea);
router.delete('/tareas/:id', ctrl.eliminarTarea);

// ============================================================
// COMUNICACIONES
// ============================================================
router.get('/comunicaciones', ctrl.listarComunicaciones);
router.post('/comunicaciones', ctrl.registrarComunicacion);

// ============================================================
// PLANTILLAS
// ============================================================
router.get('/plantillas', ctrl.listarPlantillas);
router.post('/plantillas', ctrl.crearPlantilla);
router.delete('/plantillas/:id', ctrl.eliminarPlantilla);

export default router;