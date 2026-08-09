import { prisma } from '../../config/database.js';

export async function createSubscription(data: { userId: string; productId: string }) {
  return prisma.subscription.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      status: 'pending',
    },
    include: {
      product: true,
      user: true,
    },
  });
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

export async function activateSubscription(id: string) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      id,
    },
    include: {
      product: true,
    },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const startDate = new Date();
  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + subscription.product.durationDays);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: {
        id,
      },
      data: {
        status: 'active',
        startDate,
        endDate,
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

    if (updated.license?.vpnAccess) {
      await tx.vPNAccess.update({
        where: {
          id: updated.license.vpnAccess.id,
        },
        data: {
          active: true,
        },
      });
    }

    return updated;
  });
}

export async function cancelSubscription(id: string) {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: {
        id,
      },
      data: {
        status: 'cancelled',
      },
      include: {
        license: {
          include: {
            vpnAccess: true,
          },
        },
      },
    });

    const vpnAccess = subscription.license?.vpnAccess;

    if (vpnAccess) {
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
    }

    return subscription;
  });
}
