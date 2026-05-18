import { prisma } from '../lib/prisma.js';
import { distanceKm, roundKm } from '../utils/geo.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

export async function resolveNearestHub(latitude, longitude) {
  if (latitude == null || longitude == null) {
    throw badRequest('latitude and longitude are required');
  }

  const hubs = await prisma.hub.findMany({ where: { isActive: true } });

  const candidates = hubs
    .map((hub) => {
      const dist = distanceKm(latitude, longitude, hub.latitude, hub.longitude);
      return { hub, distanceKm: dist };
    })
    .filter(({ hub, distanceKm: d }) => d <= hub.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (candidates.length === 0) {
    const err = badRequest('No branch serves this location');
    err.code = 'SERVICE_AREA_NOT_COVERED';
    throw err;
  }

  const { hub, distanceKm: d } = candidates[0];
  return {
    hub_id: hub.id,
    hub_name: hub.name,
    hub_code: hub.code,
    distance_km: roundKm(d),
    hub: {
      id: hub.id,
      name: hub.name,
      code: hub.code,
      city: hub.city,
      latitude: hub.latitude,
      longitude: hub.longitude,
    },
  };
}

export async function listHubs(activeOnly = true) {
  return prisma.hub.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function getHub(id) {
  const hub = await prisma.hub.findUnique({ where: { id } });
  if (!hub) throw notFound('Hub not found');
  return hub;
}

export async function createHub(data) {
  return prisma.hub.create({ data });
}

export async function updateHub(id, data) {
  await getHub(id);
  const payload = {};
  if (data.name != null) payload.name = data.name;
  if (data.code != null) payload.code = data.code;
  if (data.line1 != null) payload.line1 = data.line1;
  if (data.city != null) payload.city = data.city;
  if (data.postalCode !== undefined) payload.postalCode = data.postalCode;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.latitude != null) payload.latitude = data.latitude;
  if (data.longitude != null) payload.longitude = data.longitude;
  if (data.radiusKm != null) payload.radiusKm = data.radiusKm;
  if (data.isActive != null) payload.isActive = data.isActive;
  return prisma.hub.update({ where: { id }, data: payload });
}

export async function deleteHub(id) {
  await getHub(id);

  const [staffCount, orderCount] = await Promise.all([
    prisma.staffProfile.count({ where: { hubId: id } }),
    prisma.order.count({ where: { hubId: id } }),
  ]);

  if (staffCount > 0 || orderCount > 0) {
    throw conflict(
      `Cannot delete: hub has ${staffCount} staff and ${orderCount} orders. Deactivate it instead.`
    );
  }

  await prisma.hub.delete({ where: { id } });
  return { deleted: true };
}
