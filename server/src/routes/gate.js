import { Router } from 'express';
import { verifySession, requireRole } from '../middleware/auth.js';
import {
  lookupQr, checkIn, checkOut, walkInRegister,
  manualOverride, getGateActivity, getOverrideReasons, flagEmergency,
} from '../controllers/gateController.js';
import {
  lookupRecurringPass, checkInRecurringPass, checkOutRecurringPass,
} from '../controllers/recurringPassController.js';

const router = Router();

router.use(verifySession);
router.use(requireRole('GUARD', 'SECURITY_HEAD'));

router.get('/override-reasons', getOverrideReasons);
router.get('/activity', getGateActivity);
router.get('/lookup/:token', lookupQr);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/walk-in', walkInRegister);
router.post('/override', manualOverride);

router.post('/emergency', flagEmergency);

router.get('/recurring/:token', lookupRecurringPass);
router.post('/recurring/check-in', checkInRecurringPass);
router.post('/recurring/check-out', checkOutRecurringPass);

export default router;
