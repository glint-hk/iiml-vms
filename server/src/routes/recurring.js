import { Router } from 'express';
import { verifySession, requireRole } from '../middleware/auth.js';
import {
  listRecurringPasses, createRecurringPass, revokeRecurringPass,
} from '../controllers/recurringPassController.js';

const router = Router();

router.use(verifySession);

router.get('/', requireRole('ADMIN', 'SECURITY_HEAD'), listRecurringPasses);
router.post('/', requireRole('ADMIN', 'SECURITY_HEAD'), createRecurringPass);
router.post('/:id/revoke', requireRole('ADMIN', 'SECURITY_HEAD'), revokeRecurringPass);

export default router;
