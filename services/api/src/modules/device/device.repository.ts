import { prisma } from '../../config/database.js';

export async function createDevice(data: { vpnAccessId: string; name: string; publicKey: string }) {
  return prisma.device.create({
    data,
  });
}

export async function findDeviceById(id: string) {
  return prisma.device.findUnique({
    where: {
      id,
    },
    include: {
      vpnAccess: {
        include: {
          license: {
            include: {
              subscription: true,
            },
          },
        },
      },
    },
  });
}

export async function listDevices(vpnAccessId: string) {
  return prisma.device.findMany({
    where: {
      vpnAccessId,
    },
  });
}

export async function countActiveDevices(vpnAccessId: string) {
  return prisma.device.count({
    where: {
      vpnAccessId,
      active: true,
    },
  });
}

export async function revokeDevice(id: string) {
  return prisma.device.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
  });
}
