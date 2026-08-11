import { prisma } from '../../config/database.js';

export async function createVPNAccess(data: {
  licenseId: string;
  protocol: string;
  vpnNodeId: string;
}) {
  return prisma.vPNAccess.create({
    data: {
      licenseId: data.licenseId,
      protocol: data.protocol,
      vpnNodeId: data.vpnNodeId,
    },
    include: {
      license: true,
      vpnNode: true,
    },
  });
}

export async function findVPNAccessByLicense(licenseId: string) {
  return prisma.vPNAccess.findUnique({
    where: {
      licenseId,
    },
    include: {
      license: true,
      vpnNode: true,
    },
  });
}

export async function findVPNAccessOwnership(licenseId: string) {
  return prisma.license.findUnique({
    where: {
      id: licenseId,
    },
    select: {
      id: true,
      subscription: {
        select: {
          userId: true,
        },
      },
    },
  });
}

export async function updateVPNAccessConfig(id: string, configUrl: string) {
  return prisma.vPNAccess.update({
    where: {
      id,
    },
    data: {
      configUrl,
    },
  });
}

export async function findActiveVPNNode() {
  return prisma.vPNNode.findFirst({
    where: {
      active: true,
      protocol: 'wireguard',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
