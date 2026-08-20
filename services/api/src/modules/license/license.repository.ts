import { prisma } from '../../config/database.js';

export async function createLicense(subscriptionId: string, licenseKey: string) {
  return prisma.license.create({
    data: {
      subscriptionId,
      licenseKey,
    },

    include: {
      subscription: {
        include: {
          user: true,
          product: true,
        },
      },
    },
  });
}

export async function findLicenseById(id: string) {
  return prisma.license.findUnique({
    where: {
      id,
    },

    include: {
      subscription: {
        include: {
          user: true,
          product: true,
        },
      },

      vpnAccess: {
        include: {
          devices: true,
        },
      },
    },
  });
}

export async function findLicenseBySubscription(subscriptionId: string) {
  return prisma.license.findUnique({
    where: {
      subscriptionId,
    },

    include: {
      subscription: {
        include: {
          user: true,
          product: true,
        },
      },

      vpnAccess: {
        include: {
          devices: true,
        },
      },
    },
  });
}

export async function listLicenses() {
  return prisma.license.findMany({
    include: {
      subscription: {
        include: {
          user: true,
          product: true,
        },
      },

      vpnAccess: {
        include: {
          devices: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}
