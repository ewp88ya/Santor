import { randomUUID } from 'node:crypto';

import { prisma } from '../../config/database.js';
import { revokeEntitlementInTransaction } from '../entitlement/entitlement.revocation.service.js';

export async function createSubscription(data: { userId: string; productId: string }) {
  const licenseKey = `SANTOR-${randomUUID().replaceAll('-', '').toUpperCase()}`;

  return prisma.$transaction(
    async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId: data.userId,
          productId: data.productId,
          status: 'pending',
          license: {
            create: {
              licenseKey,
              status: 'pending',
            },
          },
        },
        include: {
          product: true,
          user: true,
          license: true,
        },
      });

      return subscription;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function findSubscriptionById(id: string) {
  return prisma.subscription.findUnique({
    where: {
      id,
    },
    include: {
      product: true,
      user: true,
      payments: true,
      license: {
        include: {
          vpnAccess: {
            include: {
              devices: true,
            },
          },
        },
      },
    },
  });
}

export async function findUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
    },
    include: {
      product: true,
      payments: true,
      license: {
        include: {
          vpnAccess: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function cancelSubscription(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const subscription = await tx.subscription.update({
        where: {
          id,
        },
        data: {
          status: 'cancelled',
        },
        include: {
          license: true,
        },
      });

      await revokeEntitlementInTransaction(id, tx);

      return subscription;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );
}
