import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { getVPNMode } from '../../config/vpn-mode.js';
import { generateVPNAccess } from '../vpn-access/vpn-access.service.js';

type TransactionClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

async function activateEntitlementWithinTransaction(subscriptionId: string, tx: TransactionClient) {
  const subscription = await tx.subscription.findUnique({
    where: {
      id: subscriptionId,
    },
    include: {
      product: true,
      license: {
        include: {
          vpnAccess: true,
        },
      },
    },
  });

  if (!subscription) {
    throw createError(404, 'Subscription not found');
  }

  if (subscription.status === 'cancelled') {
    throw createError(409, 'Cancelled subscription cannot be activated');
  }

  if (!subscription.license) {
    throw createError(409, 'Cannot activate entitlement without license');
  }

  const mode = getVPNMode(subscription.product.code);

  const now = new Date();
  const startDate = subscription.startDate ?? now;

  const endDate =
    subscription.status === 'active' && subscription.endDate
      ? subscription.endDate
      : new Date(startDate.getTime() + subscription.product.durationDays * 24 * 60 * 60 * 1000);

  const updatedSubscription = await tx.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      status: 'active',
      startDate,
      endDate,
    },
    include: {
      product: true,
      user: true,
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

  await tx.license.update({
    where: {
      id: updatedSubscription.license!.id,
    },
    data: {
      status: 'active',
    },
  });

  /*
   * GENERAL:
   *
   * Entitlement activation is complete at the application/database layer.
   * General VPN provisioning is handled separately.
   */
  if (mode === 'general') {
    return {
      ...updatedSubscription,
      mode,
    };
  }

  /*
   * WIREGUARD:
   *
   * generateVPNAccess receives the SAME Prisma transaction client.
   * Therefore VPN access creation/update participates in the
   * payment -> entitlement atomic transaction.
   */
  const vpnAccess = await generateVPNAccess(updatedSubscription.license!.id, tx);

  return {
    ...updatedSubscription,
    mode,
    vpnAccess,
  };
}

/**
 * Activate an entitlement in its own transaction.
 *
 * Used by non-payment callers.
 */
export async function activateEntitlement(subscriptionId: string) {
  return prisma.$transaction(
    async (tx) => activateEntitlementWithinTransaction(subscriptionId, tx),
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

/**
 * Activate an entitlement as part of an EXISTING transaction.
 *
 * This is intentionally exported for payment lifecycle processing so that:
 *
 * payment success
 *      ↓
 * subscription activation
 *      ↓
 * license activation
 *      ↓
 * VPN access activation
 *
 * all commit or rollback together.
 */
export async function activateEntitlementInTransaction(
  subscriptionId: string,
  tx: TransactionClient,
) {
  return activateEntitlementWithinTransaction(subscriptionId, tx);
}
