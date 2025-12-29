import { Router } from 'express';
import { changePassword } from '../controllers/auth.controller';
const router = Router();

router.post('/change-password', changePassword);router.post('/change-password', changePassword);



export default router;
