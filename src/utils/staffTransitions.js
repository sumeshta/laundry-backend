import { badRequest, forbidden } from './errors.js';

/** Statuses pickup staff see in their queue */
export const PICKUP_QUEUE_STATUSES = [
  'confirmed',
  'pickup_assigned',
  'pickup_in_progress',
  'picked_up',
  'verification_pending',
];

/** Statuses delivery staff see */
export const DELIVERY_QUEUE_STATUSES = ['ready_for_delivery', 'out_for_delivery'];

/** Allowed next status for pickup staff (one step forward) */
export const PICKUP_NEXT = {
  confirmed: 'pickup_assigned',
  pickup_assigned: 'pickup_in_progress',
  pickup_in_progress: 'picked_up',
  picked_up: 'in_processing',
};

/** Allowed next status for delivery staff */
export const DELIVERY_NEXT = {
  ready_for_delivery: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

/** Hub operator / manager: pickup + delivery steps */
export const HUB_OPERATOR_NEXT = {
  ...PICKUP_NEXT,
  verification_pending: 'in_processing',
  in_processing: 'ready_for_delivery',
  ready_for_delivery: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export function queueStatusesForRole(staffRole) {
  switch (staffRole) {
    case 'pickup':
      return PICKUP_QUEUE_STATUSES;
    case 'delivery':
      return DELIVERY_QUEUE_STATUSES;
    case 'hub_operator':
    case 'manager':
      return [
        ...PICKUP_QUEUE_STATUSES,
        'in_processing',
        ...DELIVERY_QUEUE_STATUSES,
      ];
    default:
      return PICKUP_QUEUE_STATUSES;
  }
}

export function nextStatusForRole(staffRole, currentStatus) {
  const map =
    staffRole === 'delivery'
      ? DELIVERY_NEXT
      : staffRole === 'hub_operator' || staffRole === 'manager'
        ? HUB_OPERATOR_NEXT
        : PICKUP_NEXT;
  return map[currentStatus] || null;
}

export function assertStaffCanSetStatus(staffRole, fromStatus, toStatus) {
  const allowed = nextStatusForRole(staffRole, fromStatus);
  if (!allowed || allowed !== toStatus) {
    throw badRequest(
      `Cannot change status from ${fromStatus} to ${toStatus} as ${staffRole} staff`
    );
  }
}

export function getPickupStatusGuide() {
  return [
    { from: 'confirmed', to: 'pickup_assigned', label: 'Accept / assign pickup' },
    { from: 'pickup_assigned', to: 'pickup_in_progress', label: 'Start pickup (en route)' },
    { from: 'pickup_in_progress', to: 'picked_up', label: 'Mark picked up from customer' },
    { from: 'picked_up', to: 'in_processing', label: 'Hand over to hub for processing' },
  ];
}
