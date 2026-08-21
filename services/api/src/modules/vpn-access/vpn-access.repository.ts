import type { Prisma } from '@prisma/client';

import { prisma } from '../../config/database.js';

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export async function createVPNAccess(
  data: {
    licenseId: string;
    protocol: string;
    vpnNodeId: string;
  },
  db: PrismaClientOrTransaction = prisma,
) {
  return db.vPNAccess.create({
    data: {
      licenseId: data.licenseId,
      protocol: data.protocol,
      vpnNodeId: data.vpnNodeId,
    },
    include: {
      license: true,
      vpnNode: true,
    },
  });
}

export async function findVPNAccessByLicense(
  licenseId: string,
  db: PrismaClientOrTransaction = prisma,
) {
  return db.vPNAccess.findUnique({
    where: {
      licenseId,
    },
    include: {
      license: true,
      vpnNode: true,
    },
  });
}

export async function findVPNAccessOwnership(
  licenseId: string,
  db: PrismaClientOrTransaction = prisma,
) {
  return db.license.findUnique({
    where: {
      id: licenseId,
    },
    select: {
      id: true,
      subscription: {
        select: {
          userId: true,
          product: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
}

export async function findActiveVPNNode(db: PrismaClientOrTransaction = prisma) {
  return db.vPNNode.findFirst({
    where: {
      active: true,
      protocol: 'wireguard',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
