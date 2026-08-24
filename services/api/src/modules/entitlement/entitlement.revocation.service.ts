import { prisma } from '../../config/database.js';

type TransactionClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

export async function revokeEntitlementInTransaction(
  subscriptionId: string,
  tx: TransactionClient,
) {
  const subscription = await tx.subscription.findUnique({
    where: {
      id: subscriptionId,
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

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.license) {
    await tx.license.update({
      where: {
        id: subscription.license.id,
      },
      data: {
        status: 'inactive',
      },
    });

    const vpnAccess = subscription.license.vpnAccess;

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
  }

  return {
    subscriptionId,
    revoked: true,
  };
}

export async function revokeEntitlement(subscriptionId: string) {
  return prisma.$transaction(async (tx) => revokeEntitlementInTransaction(subscriptionId, tx), {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  });
}
