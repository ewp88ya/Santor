import createError from 'http-errors';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../config/database.js';

import {
  createVPNAccess,
  findVPNAccessByLicense,
  findVPNAccessOwnership,
  findActiveVPNNode,
} from './vpn-access.repository.js';

import { getVPNMode } from '../../config/vpn-mode.js';

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export async function generateVPNAccess(licenseId: string, db: PrismaClientOrTransaction = prisma) {
  const ownership = await findVPNAccessOwnership(licenseId, db);

  if (!ownership) {
    throw createError(404, 'License not found');
  }

  const mode = getVPNMode(ownership.subscription.product.code);

  if (mode !== 'wireguard') {
    throw createError(409, `VPN access provisioning is not supported for ${mode} mode`);
  }

  const existing = await findVPNAccessByLicense(licenseId, db);

  if (existing) {
    if (!existing.active) {
      return db.vPNAccess.update({
        where: {
          id: existing.id,
        },
        data: {
          active: true,
        },
        include: {
          license: true,
          vpnNode: true,
        },
      });
    }

    return existing;
  }

  const vpnNode = await findActiveVPNNode(db);

  if (!vpnNode) {
    throw createError(503, 'No active VPN node available');
  }

  const vpnAccess = await createVPNAccess(
    {
      licenseId,
      protocol: 'wireguard',
      vpnNodeId: vpnNode.id,
    },
    db,
  );

  return db.vPNAccess.update({
    where: {
      id: vpnAccess.id,
    },
    data: {
      active: true,
    },
    include: {
      license: true,
      vpnNode: true,
    },
  });
}

export async function generateOwnedVPNAccess(licenseId: string, userId: string) {
  const ownership = await findVPNAccessOwnership(licenseId);

  if (!ownership) {
    throw createError(404, 'License not found');
  }

  if (ownership.subscription.userId !== userId) {
    throw createError(404, 'License not found');
  }

  return generateVPNAccess(licenseId);
}
