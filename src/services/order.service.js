import { prisma } from '../lib/prisma.js';
import { resolveNearestHub } from './hub.service.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { mapOrder } from '../utils/serialize.js';
import { notifyNewOrder } from './notification.service.js';
import { assertStaffCanSetStatus } from '../utils/staffTransitions.js';

const CUSTOMER_EDITABLE = ['draft', 'pending_confirmation'];

export async function createDraft(customerId) {
  const order = await prisma.order.create({
    data: {
      customerId,
      status: 'draft',
    },
    include: orderIncludes,
  });
  return mapOrder(order);
}

export async function listOrders(customerId, { status, page = 1, limit = 20 } = {}) {
  const where = { customerId, ...(status ? { status } : {}) };
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map((o) => mapOrder(o)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getOrder(orderId, userId, role) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      ...orderIncludes,
      hub: true,
      history: { orderBy: { createdAt: 'asc' } },
      assignments: { include: { staff: { select: { id: true, fullName: true, phone: true } } } },
    },
  });

  if (!order) throw notFound('Order not found');
  assertOrderAccess(order, userId, role);
  return mapOrder(order);
}

export async function updateDraft(orderId, customerId, data) {
  const order = await getEditableOrder(orderId, customerId);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      pickupLine1: data.pickupLine1 ?? order.pickupLine1,
      pickupCity: data.pickupCity ?? order.pickupCity,
      pickupPostal: data.pickupPostal ?? order.pickupPostal,
      pickupLatitude: data.pickupLatitude ?? order.pickupLatitude,
      pickupLongitude: data.pickupLongitude ?? order.pickupLongitude,
      pickupInstructions: data.pickupInstructions ?? order.pickupInstructions,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : order.deliveryDate,
      pickupWindow: data.pickupWindow ?? order.pickupWindow,
      notes: data.notes ?? order.notes,
    },
    include: orderIncludes,
  });

  if (data.lineItems) {
    await replaceLineItems(order.id, data.lineItems);
    return computeEstimate(order.id, customerId);
  }

  return mapOrder(updated);
}

export async function setLineItems(orderId, customerId, items) {
  await getEditableOrder(orderId, customerId);
  await replaceLineItems(orderId, items);
  return computeEstimate(orderId, customerId);
}

async function replaceLineItems(orderId, items) {
  if (!items?.length) {
    await prisma.orderLineItem.deleteMany({ where: { orderId } });
    return;
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const rows = items.map((item) => {
    const product = productMap[item.productId];
    if (!product) throw badRequest(`Invalid product: ${item.productId}`);
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice = Number(product.basePrice);
    return {
      orderId,
      productId: product.id,
      quantity: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
      productName: product.name,
      notes: item.notes,
    };
  });

  await prisma.$transaction([
    prisma.orderLineItem.deleteMany({ where: { orderId } }),
    prisma.orderLineItem.createMany({ data: rows }),
  ]);
}

export async function computeEstimate(orderId, customerId) {
  const order = await getEditableOrder(orderId, customerId);

  const lineItems = await prisma.orderLineItem.findMany({ where: { orderId } });
  const estimatedTotal = lineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0);

  let hubId = order.hubId;
  let hubAssignedAt = order.hubAssignedAt;

  if (order.pickupLatitude != null && order.pickupLongitude != null) {
    try {
      const resolved = await resolveNearestHub(order.pickupLatitude, order.pickupLongitude);
      hubId = resolved.hub_id;
      hubAssignedAt = new Date();
    } catch (e) {
      if (e.code !== 'SERVICE_AREA_NOT_COVERED') throw e;
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      estimatedTotal,
      hubId,
      hubAssignedAt,
      status: order.status === 'draft' ? 'pending_confirmation' : order.status,
    },
    include: { ...orderIncludes, hub: true },
  });

  return mapOrder(updated);
}

export async function confirmOrder(orderId, customerId) {
  const order = await getEditableOrder(orderId, customerId);

  if (!order.pickupLatitude || !order.pickupLongitude) {
    throw badRequest('Pickup location is required before confirming');
  }

  const lineItems = await prisma.orderLineItem.findMany({ where: { orderId } });
  if (lineItems.length === 0) {
    throw badRequest('Add at least one item before confirming');
  }

  const resolved = await resolveNearestHub(order.pickupLatitude, order.pickupLongitude);
  const estimatedTotal = lineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0);
  const orderNumber = await generateOrderNumber();

  const confirmed = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: {
        orderNumber,
        status: 'confirmed',
        hubId: resolved.hub_id,
        hubAssignedAt: new Date(),
        confirmedAt: new Date(),
        estimatedTotal,
      },
      include: { ...orderIncludes, hub: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'confirmed',
        actorId: customerId,
        notes: `Assigned to ${resolved.hub_name}`,
      },
    });

    return o;
  });

  const mapped = mapOrder(confirmed);
  notifyNewOrder(mapped).catch((err) => console.error('notifyNewOrder failed', err));
  return mapped;
}

export async function cancelOrder(orderId, customerId, reason) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
  });
  if (!order) throw notFound('Order not found');

  const cancellable = ['draft', 'pending_confirmation', 'confirmed', 'pickup_assigned'];
  if (!cancellable.includes(order.status)) {
    throw badRequest('Order cannot be cancelled at this stage');
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || 'Customer cancelled',
      },
      include: orderIncludes,
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'cancelled',
        actorId: customerId,
      },
    });

    return o;
  });

  return mapOrder(cancelled);
}

export async function updateOrderStatus(orderId, actorId, role, newStatus, notes) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Order not found');

  if (role === 'staff') {
    const staff = await prisma.staffProfile.findUnique({ where: { userId: actorId } });
    if (!staff || (order.hubId && staff.hubId !== order.hubId)) {
      throw forbidden('Not assigned to this hub');
    }
    assertStaffCanSetStatus(staff.staffRole, order.status, newStatus);
  } else if (role !== 'admin' && role !== 'hub_manager') {
    throw forbidden();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: orderIncludes,
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        actorId,
        notes,
      },
    });

    return o;
  });

  return mapOrder(updated);
}

export async function adminListOrders(filters = {}) {
  const { hubId, status, page = 1, limit = 20 } = filters;
  const where = {
    ...(hubId ? { hubId } : {}),
    ...(status ? { status } : {}),
  };
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        ...orderIncludes,
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        hub: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map(mapOrder),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getReportsSummary() {
  const [totalOrders, confirmedOrders, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { notIn: ['draft', 'cancelled'] } } }),
    prisma.order.aggregate({
      _sum: { finalTotal: true, estimatedTotal: true },
      where: { status: 'delivered' },
    }),
  ]);

  const byHub = await prisma.order.groupBy({
    by: ['hubId'],
    _count: { id: true },
    where: { hubId: { not: null }, status: { not: 'cancelled' } },
  });

  return {
    total_orders: totalOrders,
    active_orders: confirmedOrders,
    delivered_revenue: Number(revenue._sum.finalTotal || revenue._sum.estimatedTotal || 0),
    orders_by_hub: byHub,
  };
}

async function getEditableOrder(orderId, customerId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: orderIncludes,
  });
  if (!order) throw notFound('Order not found');
  if (!CUSTOMER_EDITABLE.includes(order.status)) {
    throw badRequest('Order can no longer be edited');
  }
  return order;
}

function assertOrderAccess(order, userId, role) {
  if (role === 'admin' || role === 'hub_manager') return;
  if (order.customerId === userId) return;
  if (role === 'staff') return; // staff access checked per assignment in future
  throw forbidden();
}

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: { orderNumber: { not: null } },
  });
  return `FF-${year}-${String(count + 1).padStart(5, '0')}`;
}

const orderIncludes = {
  lineItems: { include: { product: { select: { id: true, slug: true, unit: true } } } },
  hub: { select: { id: true, name: true, code: true, city: true } },
};
