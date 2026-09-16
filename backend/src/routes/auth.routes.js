import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// RUTAS PÚBLICAS
// ============================================================
router.post('/login', ctrl.login);
router.post('/register', ctrl.register);

// ============================================================
// RUTAS AUTENTICADAS
// ============================================================
router.get('/me', verificarToken, ctrl.me);
router.get('/roles', verificarToken, soloAdmin, ctrl.listarRoles);

// ============================================================
// GESTIÓN DE EMPLEADOS (SOLO ADMIN)
// ============================================================
router.get('/empleados', verificarToken, soloAdmin, ctrl.listarEmpleados);
router.get('/empleados/:id', verificarToken, soloAdmin, ctrl.verEmpleado);
router.post('/empleados', verificarToken, soloAdmin, ctrl.crearEmpleado);
router.put('/empleados/:id', verificarToken, soloAdmin, ctrl.actualizarEmpleado);
router.put('/empleados/:id/password', verificarToken, soloAdmin, ctrl.cambiarPasswordEmpleado);
router.put('/empleados/:id/reactivar', verificarToken, soloAdmin, ctrl.reactivarEmpleado);
router.delete('/empleados/:id', verificarToken, soloAdmin, ctrl.eliminarEmpleado);

export default router;