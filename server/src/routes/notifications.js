import { Router } from 'express';
import { verifySession } from '../middleware/auth.js';
import {
  getMyNotifications, markNotificationRead, markAllRead, getUnreadCount,
} from '../controllers/notificationController.js';

const router = Router();

router.use(verifySession);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);
router.post('/:id/read', markNotificationRead);

export default router;
