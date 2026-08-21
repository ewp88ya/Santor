import createError from 'http-errors';

import { prisma } from '../../config/database.js';

import { getVPNMode } from '../../config/vpn-mode.js';
import { generateVPNAccess } from '../vpn-access/vpn-access.service.js';

export async function activateEntitlement(subscriptionId: string) {
  return prisma.$transaction(
    async (tx) => {
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
       * Activation is complete at the entitlement layer.
       * Smart VPN / Smart Proxy provisioning belongs to
       * the General application layer.
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
       * VPNAccess is part of the same database transaction.
       * No external provisioning/network call occurs here.
       */
      const vpnAccess = await generateVPNAccess(updatedSubscription.license!.id, tx);

      return {
        ...updatedSubscription,
        mode,
        vpnAccess,
      };
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );
}
