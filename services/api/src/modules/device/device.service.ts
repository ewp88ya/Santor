import { randomUUID } from 'node:crypto';

import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { getDeviceLimit } from '../../config/vpn-policy.js';

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
  revokeWireGuardPeer,
} from '../wireguard/wireguard.service.js';

import { auditLog } from '../audit/audit.service.js';

function devicePublicKey() {
  return randomUUID().replaceAll('-', '');
}

function ensureDeviceVPNNodeConsistency(vpnAccess: {
  id: string;
  vpnNodeId: string;
  vpnNode: {
    id: string;
    active: boolean;
    protocol: string;
  };
}) {
  if (vpnAccess.vpnNodeId !== vpnAccess.vpnNode.id) {
    throw createError(503, 'VPN Access and VPN node are inconsistent');
  }

  if (!vpnAccess.vpnNode.active) {
    throw createError(503, 'VPN node is inactive');
  }

  if (vpnAccess.vpnNode.protocol !== 'wireguard') {
    throw createError(503, 'VPN node protocol is not supported');
  }
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

function ensureActiveSubscription(
  subscription:
    | {
        status: string;
      }
    | null
    | undefined,
) {
  if (!subscription) {
    throw createError(403, 'Active subscription required');
  }

  if (subscription.status !== 'active') {
    throw createError(403, 'Subscription is not active');
  }
}

function ensureActiveVPNAccess(active: boolean) {
  if (!active) {
    throw createError(403, 'VPN Access is inactive');
  }
}

function ensureValidVPNNode(
  node:
    | {
        active: boolean;
        protocol: string;
      }
    | null
    | undefined,
) {
  if (!node) {
    throw createError(503, 'VPN node not configured');
  }

  if (!node.active) {
    throw createError(503, 'VPN node is inactive');
  }

  if (node.protocol.toLowerCase() !== 'wireguard') {
    throw createError(503, 'VPN node protocol is not supported');
  }
}

export async function addDevice(userId: string, vpnAccessId: string, name: string) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      vpnNode: true,
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

  ensureActiveSubscription(vpnAccess.license?.subscription);

  ensureActiveVPNAccess(vpnAccess.active);

  ensureValidVPNNode(vpnAccess.vpnNode);

  const activeDevices = await countActiveDevices(vpnAccessId);

  const product = vpnAccess.license?.subscription?.product;

  if (!product) {
    throw createError(503, 'Subscription product not configured');
  }

  const deviceLimit = getDeviceLimit(product.code, product.deviceLimit);

  if (activeDevices >= deviceLimit) {
    await auditLog({
      userId,
      action: 'DEVICE_LIMIT_REACHED',
      resource: 'DEVICE',
      resourceId: vpnAccessId,
      metadata: {
        limit: deviceLimit,
        activeDevices,
      },
    });

    throw createError(403, `Device limit reached (${deviceLimit})`);
  }

  const device = await createDevice({
    vpnAccessId,
    name,
    publicKey: devicePublicKey(),
  });

  try {
    await generateWireGuardPeer(device.id);
  } catch (error) {
    await prisma.device.delete({
      where: {
        id: device.id,
      },
    });

    throw error;
  }

  await auditLog({
    userId,
    action: 'DEVICE_CREATED',
    resource: 'DEVICE',
    resourceId: device.id,
  });

  return findDeviceById(device.id);
}

export async function getDevice(userId: string, id: string) {
  const device = await findDeviceById(id);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  await checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId, 'DEVICE', id);

  ensureActiveSubscription(device.vpnAccess?.license?.subscription);

  ensureActiveVPNAccess(device.vpnAccess?.active ?? false);

  ensureValidVPNNode(device.vpnAccess?.vpnNode);

  return device;
}

export async function getDevices(userId: string, vpnAccessId: string) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      vpnNode: true,
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

  ensureActiveSubscription(vpnAccess.license?.subscription);

  ensureActiveVPNAccess(vpnAccess.active);

  ensureValidVPNNode(vpnAccess.vpnNode);

  return listDevices(vpnAccessId);
}

export async function disableDevice(userId: string, deviceId: string) {
  const device = await findDeviceById(deviceId);

  if (!device) {
    throw createError(404, 'Device not found');
  }

  await checkOwnership(device.vpnAccess?.license?.subscription?.userId, userId, 'DEVICE', deviceId);

  if (!device.active) {
    return device;
  }

  await revokeWireGuardPeer(deviceId);

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

  ensureActiveSubscription(device.vpnAccess?.license?.subscription);

  ensureActiveVPNAccess(device.vpnAccess?.active ?? false);

  ensureValidVPNNode(device.vpnAccess?.vpnNode);

  if (!device.active) {
    throw createError(403, 'Device is inactive');
  }

  const result = await regenerateWireGuardConfig(userId, deviceId);

  await auditLog({
    userId,
    action: 'DEVICE_CONFIG_REGENERATED',
    resource: 'DEVICE',
    resourceId: deviceId,
  });

  return result;
}
