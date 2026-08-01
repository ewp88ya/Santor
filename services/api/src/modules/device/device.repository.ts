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
      vpnAccess: true,
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

export async function countActiveDevices(
  vpnAccessId: string,
) {
  return prisma.device.count({
    where: {
      vpnAccessId,
      active: true,
    },
  });
}
