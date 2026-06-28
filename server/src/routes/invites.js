import { Router } from 'express';
import { verifySession, requireRole } from '../middleware/auth.js';
import {
  createInvite, getMyInvites, cancelInvite, getQrForVisit, bulkInvite,
} from '../controllers/inviteController.js';

const router = Router();

router.use(verifySession);

router.post('/', requireRole('HOST', 'ADMIN', 'SECURITY_HEAD'), createInvite);
router.post('/bulk', requireRole('ADMIN', 'SECURITY_HEAD'), bulkInvite);
router.get('/mine', requireRole('HOST', 'ADMIN', 'SECURITY_HEAD'), getMyInvites);
router.post('/:id/cancel', requireRole('HOST', 'ADMIN', 'SECURITY_HEAD'), cancelInvite);
router.get('/:id/qr', requireRole('HOST', 'ADMIN', 'SECURITY_HEAD'), getQrForVisit);

export default router;
