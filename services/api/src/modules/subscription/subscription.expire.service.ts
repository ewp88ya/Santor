import { prisma } from '../../config/database.js';

export async function expireSubscriptions() {
  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
      endDate: {
        lt: now,
      },
    },
    include: {
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

  let expired = 0;

  for (const subscription of subscriptions) {
    /*
     * Auto-debit subscriptions are handled by the
     * renewal worker before permanent expiration.
     *
     * Keep them active while they are inside the
     * renewal/grace lifecycle.
     */
    if (subscription.autoDebitEnabled) {
      if (subscription.gracePeriodEnd && subscription.gracePeriodEnd > now) {
        continue;
      }

      if (!subscription.gracePeriodEnd) {
        continue;
      }
    }

    await prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: 'expired',
      },
    });

    const vpnAccess = subscription.license?.vpnAccess;

    if (vpnAccess) {
      await prisma.vPNAccess.update({
        where: {
          id: vpnAccess.id,
        },
        data: {
          active: false,
        },
      });

      await prisma.device.updateMany({
        where: {
          vpnAccessId: vpnAccess.id,
        },
        data: {
          active: false,
        },
      });
    }

    expired += 1;
  }

  return expired;
}
