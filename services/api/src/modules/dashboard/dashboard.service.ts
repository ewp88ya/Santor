import createError from 'http-errors';

import { getUserDashboard } from './dashboard.repository.js';

export async function getDashboard(userId: string) {
  const user = await getUserDashboard(userId);

  if (!user) {
    throw createError(404, 'User not found');
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerified: user.emailVerified,
    },

    subscriptions: user.subscriptions.map((subscription) => ({
      id: subscription.id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,

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
                  serverNode: subscription.license.vpnAccess.serverNode,

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
    })),
  };
}
