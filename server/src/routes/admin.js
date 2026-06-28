import { Router } from 'express';
import { verifySession, requireRole } from '../middleware/auth.js';
import {
  getVisitorLog, getOccupancy, getBlacklist, addBlacklist, removeBlacklist,
  getIncidents, getDataSubjectRequests, createDataSubjectRequest,
  completeDataSubjectRequest, exportVisitorLog, getDashboardStats,
  getAuditLog, getUsers, updateUserRole, getGates,
  getOverstayVisitors, resolveIncident,
} from '../controllers/adminController.js';

const router = Router();

router.use(verifySession);

router.get('/occupancy', requireRole('ADMIN', 'SECURITY_HEAD', 'LEADERSHIP'), getOccupancy);
router.get('/dashboard', requireRole('ADMIN', 'SECURITY_HEAD', 'LEADERSHIP'), getDashboardStats);
router.get('/visitors', requireRole('ADMIN', 'SECURITY_HEAD', 'LEADERSHIP'), getVisitorLog);
router.get('/export', requireRole('ADMIN', 'SECURITY_HEAD'), exportVisitorLog);
router.get('/blacklist', requireRole('ADMIN', 'SECURITY_HEAD'), getBlacklist);
router.post('/blacklist', requireRole('ADMIN', 'SECURITY_HEAD'), addBlacklist);
router.delete('/blacklist/:id', requireRole('ADMIN', 'SECURITY_HEAD'), removeBlacklist);
router.get('/incidents', requireRole('ADMIN', 'SECURITY_HEAD'), getIncidents);
router.get('/dsr', requireRole('ADMIN'), getDataSubjectRequests);
router.post('/dsr', requireRole('ADMIN'), createDataSubjectRequest);
router.post('/dsr/:id/complete', requireRole('ADMIN'), completeDataSubjectRequest);
router.get('/audit', requireRole('ADMIN', 'SECURITY_HEAD', 'IT_ADMIN'), getAuditLog);
router.get('/users', requireRole('IT_ADMIN', 'ADMIN'), getUsers);
router.patch('/users/:id', requireRole('IT_ADMIN'), updateUserRole);
router.get('/gates', getGates);
router.get('/overstay', requireRole('ADMIN', 'SECURITY_HEAD'), getOverstayVisitors);
router.patch('/incidents/:id/resolve', requireRole('ADMIN', 'SECURITY_HEAD'), resolveIncident);

export default router;
