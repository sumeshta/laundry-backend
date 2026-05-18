import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { statusSchema } from '../validators/schemas.js';
import { prisma } from '../lib/prisma.js';
import { mapOrder } from '../utils/serialize.js';
import * as orderService from '../services/order.service.js';
import { queueStatusesForRole, getPickupStatusGuide } from '../utils/staffTransitions.js';

const router = Router();

router.use(authenticate, requireRoles('staff', 'admin', 'hub_manager'));

router.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: req.user.id },
      include: { hub: true },
    });

    const role = staffProfile?.staffRole || 'pickup';
    const statusFilter = queueStatusesForRole(role);

    const where = {
      status: { in: statusFilter },
    };

    if (staffProfile?.hubId) {
      where.hubId = staffProfile.hubId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        lineItems: true,
        hub: true,
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        assignments: true,
      },
      orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    res.json({
      data: orders.map(mapOrder),
      hub: staffProfile?.hub || null,
      staffRole: role,
      statusGuide: role === 'pickup' ? getPickupStatusGuide() : null,
    });
  })
);

router.patch(
  '/orders/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body.status,
      req.body.notes
    );
    res.json(order);
  })
);

export default router;
