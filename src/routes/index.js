import { Router } from 'express';
import authRoutes from './auth.routes.js';
import addressesRoutes from './addresses.routes.js';
import hubsRoutes from './hubs.routes.js';
import catalogRoutes from './catalog.routes.js';
import ordersRoutes from './orders.routes.js';
import adminRoutes from './admin.routes.js';
import staffRoutes from './staff.routes.js';
import notificationsRoutes from './notifications.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'laundry-api', version: '1.0.0' });
});

router.use('/settings', settingsRoutes);
router.use('/auth', authRoutes);
router.use('/me/addresses', addressesRoutes);
router.use('/hubs', hubsRoutes);
router.use('/', catalogRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
