import { prisma } from '../lib/prisma.js';

export async function runExpiryCheck() {
  const now = new Date();

  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        lte: now,
      },
    },
    include: {
      license: {
        include: {
          vpnAccess: true,
        },
      },
    },
  });

  console.log(`[EXPIRY] Found ${expiredSubscriptions.length} expired subscriptions`);

  for (const subscription of expiredSubscriptions) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          status: 'EXPIRED',
        },
      });

      const vpnAccess = subscription.license?.vpnAccess;

      if (!vpnAccess) {
        return;
      }

      await tx.vPNAccess.update({
        where: {
          id: vpnAccess.id,
        },
        data: {
          active: false,
        },
      });

      await tx.device.updateMany({
        where: {
          vpnAccessId: vpnAccess.id,
        },
        data: {
          active: false,
        },
      });
    });
  }

  return {
    expired: expiredSubscriptions.length,
  };
}
