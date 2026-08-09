import { randomUUID } from 'node:crypto';

import createError from 'http-errors';

import { prisma } from '../../config/database.js';

import {
  createDevice,
  findDeviceById,
  listDevices,
  countActiveDevices,
  revokeDevice,
} from './device.repository.js';

import {
  generateWireGuardPeer,
  regenerateWireGuardConfig,
} from '../wireguard/wireguard.service.js';

import { auditLog } from '../audit/audit.service.js';

function generateClientKey() {
  return randomUUID().replaceAll('-', '');
}

async function checkOwnership(
  ownerId: string | undefined,
  userId: string,
  resource: string,
  resourceId: string,
) {
  if (!ownerId || ownerId !== userId) {
    await auditLog({
      userId,
      action: 'ACCESS_DENIED',
      resource,
      resourceId,
      metadata: {
        reason: 'OWNERSHIP_MISMATCH',
      },
    });

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

  await checkOwnership(vpnAccess.license?.subscription?.userId, userId, 'VPN_ACCESS', vpnAccessId);

  const limit = vpnAccess.license.subscription.product.deviceLimit;

  const activeDevices = await countActiveDevices(vpnAccessId);

  if (activeDevices >= limit) {
    await auditLog({
      userId,
      action: 'DEVICE_LIMIT_REACHED',
      resource: 'DEVICE',
      resourceId: vpnAccessId,
      metadata: {
        limit,
        activeDevices,
      },
    });

    throw createError(403, `Device limit reached (${limit})`);
  }

  const publicKey = generateClientKey();

  const device = await createDevice({
    vpnAccessId,
    name,
    publicKey,
  });

  await generateWireGuardPeer(device.id);

  await auditLog({
    userId,
    action: 'DEVICE_CREATED',
    resource: 'DEVICE',
    resourceId: device.id,
  });

  return device;
}

export async function getDevice(userId: string, id: string) {
  const device = await findDeviceById(id);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  await checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId, 'DEVICE', id);

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

  await checkOwnership(vpnAccess.license?.subscription?.userId, userId, 'VPN_ACCESS', vpnAccessId);

  return listDevices(vpnAccessId);
}

export async function disableDevice(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  await checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId, 'DEVICE', deviceId);

  const result = await revokeDevice(deviceId);

  await auditLog({
    userId,
    action: 'DEVICE_REVOKED',
    resource: 'DEVICE',
    resourceId: deviceId,
  });

  return result;
}

export async function regenerateDeviceConfig(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  await checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId, 'DEVICE', deviceId);

  const result = await regenerateWireGuardConfig(userId, deviceId);

  await auditLog({
    userId,
    action: 'DEVICE_CONFIG_REGENERATED',
    resource: 'DEVICE',
    resourceId: deviceId,
  });

  return result;
}
