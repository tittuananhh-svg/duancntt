import { Router } from 'express';
import { login,  refreshController, logoutController, register, getTableWithText } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.post('/register', register);
router.get('/with-text/:table', getTableWithText);
export default router;
