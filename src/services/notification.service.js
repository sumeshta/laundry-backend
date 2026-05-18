import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/errors.js';

export async function notifyNewOrder(order) {
  const orderNumber = order.orderNumber || order.id.slice(0, 8);
  const hubName = order.hub?.name;
  const title = 'New order';
  const message = hubName
    ? `Order ${orderNumber} confirmed — ${hubName}`
    : `Order ${orderNumber} confirmed`;

  const [admins, staff] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['admin', 'hub_manager'] }, isActive: true },
      select: { id: true },
    }),
    order.hubId
      ? prisma.staffProfile.findMany({
          where: { hubId: order.hubId, isActive: true },
          select: { userId: true },
        })
      : [],
  ]);

  const userIds = new Set([
    ...admins.map((u) => u.id),
    ...staff.map((s) => s.userId),
  ]);

  if (userIds.size === 0) return;

  await prisma.notification.createMany({
    data: [...userIds].map((userId) => ({
      userId,
      type: 'new_order',
      title,
      message,
      orderId: order.id,
    })),
  });
}

export async function listNotifications(userId, { unreadOnly = false, limit = 30 } = {}) {
  const where = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { data: items, unreadCount };
}

export async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  return { unreadCount: count };
}

export async function markRead(notificationId, userId) {
  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) throw notFound('Notification not found');

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { message: 'All notifications marked read' };
}
