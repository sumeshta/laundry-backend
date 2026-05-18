import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();

router.use(authenticate, requireRoles('admin', 'hub_manager', 'staff'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === 'true';
    const result = await notificationService.listNotifications(req.user.id, { unreadOnly });
    res.json(result);
  })
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user.id);
    res.json(result);
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const item = await notificationService.markRead(req.params.id, req.user.id);
    res.json(item);
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user.id);
    res.json(result);
  })
);

export default router;
