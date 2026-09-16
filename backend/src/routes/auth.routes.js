import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', verificarToken, ctrl.me);

export default router;