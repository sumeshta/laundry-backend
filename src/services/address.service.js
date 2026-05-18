import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../utils/errors.js';

export async function listAddresses(userId) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId, data) {
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const count = await prisma.address.count({ where: { userId } });
  const isDefault = data.isDefault ?? count === 0;

  return prisma.address.create({
    data: {
      userId,
      label: data.label || 'Home',
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country || 'IN',
      latitude: data.latitude,
      longitude: data.longitude,
      instructions: data.instructions,
      isDefault,
    },
  });
}

export async function updateAddress(userId, id, data) {
  await assertOwner(userId, id);

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id },
    data: {
      label: data.label,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      instructions: data.instructions,
      isDefault: data.isDefault,
    },
  });
}

export async function deleteAddress(userId, id) {
  await assertOwner(userId, id);
  await prisma.address.delete({ where: { id } });
}

async function assertOwner(userId, addressId) {
  const addr = await prisma.address.findUnique({ where: { id: addressId } });
  if (!addr) throw notFound('Address not found');
  if (addr.userId !== userId) throw forbidden();
  return addr;
}
