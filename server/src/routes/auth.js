import { Router } from 'express';
import { login, getDemoUsers, me } from '../controllers/authController.js';
import { verifySession } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/demo-users', getDemoUsers);
router.get('/me', verifySession, me);

export default router;
