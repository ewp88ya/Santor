import { prisma } from '../../config/database.js';

export async function createVPNAccess(data: {
  licenseId: string;
  protocol: string;
  serverNode: string;
}) {
  return prisma.vPNAccess.create({
    data: {
      licenseId: data.licenseId,
      protocol: data.protocol,
      serverNode: data.serverNode,
    },
    include: {
      license: true,
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
