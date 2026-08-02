import { randomUUID } from 'node:crypto';

import {
  createDevice,
  findDeviceById,
  listDevices,
  countActiveDevices,
  revokeDevice,
} from './device.repository.js';

import { prisma } from '../../config/database.js';

import createError from 'http-errors';

function generateClientKey() {
  return randomUUID().replaceAll('-', '');
}

function checkOwnership(ownerId: string | undefined, userId: string) {
  if (!ownerId || ownerId !== userId) {
    throw createError(403, 'Forbidden');
  }
}

export async function addDevice(userId: string, vpnAccessId: string, name: string) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      license: {
        include: {
          subscription: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!vpnAccess) {
    throw createError(404, 'VPN Access not found');
  }

  checkOwnership(vpnAccess.license?.subscription?.userId, userId);

  const limit = vpnAccess.license.subscription.product.deviceLimit;

  const activeDevices = await countActiveDevices(vpnAccessId);

  if (activeDevices >= limit) {
    throw createError(403, `Device limit reached (${limit})`);
  }

  const publicKey = generateClientKey();

  return createDevice({
    vpnAccessId,
    name,
    publicKey,
  });
}

export async function getDevice(userId: string, id: string) {
  const device = await findDeviceById(id);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId);

  return device;
}

export async function getDevices(userId: string, vpnAccessId: string) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      license: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!vpnAccess) {
    throw createError(404, 'VPN Access not found');
  }

  checkOwnership(vpnAccess.license?.subscription?.userId, userId);

  return listDevices(vpnAccessId);
}

export async function disableDevice(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId);

  return revokeDevice(deviceId);
}
