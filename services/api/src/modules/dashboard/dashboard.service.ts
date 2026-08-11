import createError from 'http-errors';

import { getUserDashboard } from './dashboard.repository.js';

function calculateRemainingDays(endDate: Date | null) {
  if (!endDate) {
    return null;
  }

  const remainingMs = endDate.getTime() - Date.now();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
}

export async function getDashboard(userId: string) {
  const user = await getUserDashboard(userId);

  if (!user) {
    throw createError(404, 'User not found');
  }

  const subscriptions = user.subscriptions.map((subscription) => {
    const remainingDays = calculateRemainingDays(subscription.endDate);

    const expired =
      subscription.status === 'expired' ||
      (subscription.endDate !== null && subscription.endDate.getTime() <= Date.now());

    return {
      id: subscription.id,
      status: expired ? 'expired' : subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,

      lifecycle: {
        expired,
        remainingDays,
        canUpgrade: expired || subscription.status !== 'active',
        upgradeUrl: '/pricing',
      },

      product: {
        id: subscription.product.id,
        name: subscription.product.name,
        code: subscription.product.code,
        price: subscription.product.price,
        currency: subscription.product.currency,
        durationDays: subscription.product.durationDays,
        deviceLimit: subscription.product.deviceLimit,
      },

      license: subscription.license
        ? {
            id: subscription.license.id,
            licenseKey: subscription.license.licenseKey,
            status: subscription.license.status,

            vpnAccess: subscription.license.vpnAccess
              ? {
                  id: subscription.license.vpnAccess.id,
                  protocol: subscription.license.vpnAccess.protocol,
                  serverNode: subscription.license.vpnAccess.vpnNode.hostname,
                  active: subscription.license.vpnAccess.active,

                  devices: subscription.license.vpnAccess.devices.map((device) => ({
                    id: device.id,
                    name: device.name,
                    active: device.active,
                    publicKey: device.publicKey,
                    downloadUrl: `/api/v1/wireguard/config/${device.id}`,
                  })),
                }
              : null,
          }
        : null,
    };
  });

  const activeSubscription =
    subscriptions.find(
      (subscription) => subscription.status === 'active' && !subscription.lifecycle.expired,
    ) ?? null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerified: user.emailVerified,
    },

    subscription: activeSubscription,

    subscriptions,

    upgrade: {
      available: !activeSubscription,
      url: '/pricing',
    },
  };
}
