import { prisma } from '../../config/database.js';

export async function expireSubscriptions() {
  const expired = await prisma.subscription.findMany({
    where: {
      status: 'active',
      endDate: {
        lt: new Date(),
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

  for (const subscription of expired) {
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
  }

  return expired.length;
}
