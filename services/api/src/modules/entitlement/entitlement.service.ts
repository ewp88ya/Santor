import createError from 'http-errors';

import { prisma } from '../../config/database.js';

import { getVPNMode } from '../../config/vpn-mode.js';
import { generateVPNAccess } from '../vpn-access/vpn-access.service.js';

export async function activateEntitlement(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
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

  const mode = getVPNMode(subscription.product.code);

  const now = new Date();
  const startDate = subscription.startDate ?? now;

  const endDate =
    subscription.status === 'active' && subscription.endDate
      ? subscription.endDate
      : new Date(
          startDate.getTime() +
            subscription.product.durationDays * 24 * 60 * 60 * 1000,
        );

  const updatedSubscription = await prisma.subscription.update({
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

  if (!updatedSubscription.license) {
    throw createError(
      409,
      'Cannot activate entitlement without license',
    );
  }

  await prisma.license.update({
    where: {
      id: updatedSubscription.license.id,
    },
    data: {
      status: 'active',
    },
  });

  /*
   * GENERAL:
   * Entitlement activation is sufficient.
   * Smart VPN / Smart Proxy provisioning belongs to
   * the General application layer and must not create
   * WireGuard artifacts.
   */
  if (mode === 'general') {
    return {
      ...updatedSubscription,
      mode,
    };
  }

  /*
   * WIREGUARD:
   * Only WG products create VPNAccess + WireGuard
   * configuration/provisioning.
   */
  const vpnAccess = await generateVPNAccess(
    updatedSubscription.license.id,
  );

  return {
    ...updatedSubscription,
    mode,
    vpnAccess,
  };
}
