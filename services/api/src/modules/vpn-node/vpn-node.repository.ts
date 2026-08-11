import { prisma } from '../../config/database.js';

const vpnNodePublicSelect = {
  id: true,
  name: true,
  hostname: true,
  port: true,
  protocol: true,
  publicKey: true,
  provisioningUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      vpnAccesses: true,
    },
  },
} as const;

export async function listVPNNodes() {
  return prisma.vPNNode.findMany({
    select: vpnNodePublicSelect,
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function findVPNNodeById(id: string) {
  return prisma.vPNNode.findUnique({
    where: {
      id,
    },
    select: vpnNodePublicSelect,
  });
}

export async function findVPNNodeForProvisioning(id: string) {
  return prisma.vPNNode.findUnique({
    where: {
      id,
    },
  });
}

export async function createVPNNode(data: {
  name: string;
  hostname: string;
  port: number;
  protocol: string;
  publicKey?: string;
  provisioningUrl?: string;
  provisioningKey?: string;
}) {
  return prisma.vPNNode.create({
    data,
    select: vpnNodePublicSelect,
  });
}

export async function updateVPNNode(
  id: string,
  data: {
    name?: string;
    hostname?: string;
    port?: number;
    protocol?: string;
    publicKey?: string;
    provisioningUrl?: string;
    provisioningKey?: string;
    active?: boolean;
  },
) {
  return prisma.vPNNode.update({
    where: {
      id,
    },
    data,
    select: vpnNodePublicSelect,
  });
}
