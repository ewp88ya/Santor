import { prisma } from '../../config/database.js';

export async function findPeerByDevice(deviceId: string) {
  return prisma.wireGuardPeer.findUnique({
    where: {
      deviceId,
    },
  });
}

export async function createWireGuardPeer(data: {
  deviceId: string;
  privateKey: string;
  publicKey: string;
  address: string;
  endpoint?: string;
}) {
  return prisma.wireGuardPeer.create({
    data,
  });
}

export async function updateWireGuardPeer(
  id: string,
  data: {
    endpoint?: string;
  },
) {
  return prisma.wireGuardPeer.update({
    where: {
      id,
    },
    data,
  });
}
