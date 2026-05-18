import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { badRequest, conflict, unauthorized } from '../utils/errors.js';
import { mapUser } from '../utils/serialize.js';

const SALT_ROUNDS = 12;

export async function registerCustomer({ email, password, fullName, phone, address }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        phone,
        role: 'customer',
        customerProfile: { create: {} },
      },
    });

    if (address?.latitude != null && address?.longitude != null) {
      await tx.address.create({
        data: {
          userId: created.id,
          label: 'Home',
          line1: address.line1 || 'Pickup address',
          city: address.city || '',
          postalCode: address.postalCode,
          latitude: address.latitude,
          longitude: address.longitude,
          isDefault: true,
        },
      });
    }

    return created;
  });

  const tokens = await issueTokens(user.id, user.role);
  return { user: mapUser(user), ...tokens };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) throw unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const tokens = await issueTokens(user.id, user.role);
  return { user: mapUser(user), ...tokens };
}

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const hash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash: hash, expiresAt: { gt: new Date() } },
  });

  if (!stored) throw unauthorized('Refresh token expired or revoked');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.isActive) throw unauthorized('User inactive');

  return issueTokens(user.id, user.role);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const hash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
}

async function issueTokens(userId, role) {
  const accessToken = jwt.sign({ sub: userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, tokenType: 'Bearer' };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customerProfile: true,
      staffProfile: { include: { hub: true } },
    },
  });
  if (!user) throw unauthorized();
  return mapUser(user);
}

export async function updateMe(userId, data) {
  const patch = {};
  if (data.fullName !== undefined) patch.fullName = data.fullName.trim();
  if (data.phone !== undefined) patch.phone = data.phone.trim();

  if (!Object.keys(patch).length) {
    return getMe(userId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: patch,
  });
  return mapUser(user);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.deleteMany({ where: { userId } });
  return { message: 'Password updated' };
}
