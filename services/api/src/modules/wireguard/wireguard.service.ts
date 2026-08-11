import { randomBytes } from 'node:crypto';

import createError from 'http-errors';

import { prisma } from '../../config/database.js';

import {
  createWireGuardPeer,
  findPeerByDevice,
  updateWireGuardPeer,
} from './wireguard.repository.js';

import { updateVPNAccessConfig } from '../vpn-access/vpn-access.repository.js';

import {
  provisionWireGuardPeer,
  revokeWireGuardPeer as revokeProvisionedWireGuardPeer,
} from '../vpn-provisioning/vpn-provisioning.client.js';

function generateKey() {
  return randomBytes(32).toString('base64');
}

function generateAddress() {
  return `10.0.0.${Math.floor(Math.random() * 200) + 2}/32`;
}

async function getDeviceWithNode(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: {
      id: deviceId,
    },
    include: {
      vpnAccess: {
        include: {
          vpnNode: true,
        },
      },
    },
  });

  if (!device) {
    throw createError(404, 'Device not found');
  }

  return device;
}

function validateNode(node: {
  active: boolean;
  provisioningUrl: string | null;
  provisioningKey?: string | null;
}) {
  if (!node.active) {
    throw createError(503, 'VPN node is inactive');
  }

  if (!node.provisioningUrl) {
    throw createError(503, 'VPN node provisioning is not configured');
  }

  if (!node.provisioningKey) {
    throw createError(503, 'VPN node provisioning key is not configured');
  }
}

export async function generateWireGuardPeer(deviceId: string) {
  const existing = await findPeerByDevice(deviceId);

  if (existing) {
    return existing;
  }

  const device = await getDeviceWithNode(deviceId);
  const node = device.vpnAccess.vpnNode;

  validateNode(node);

  const privateKey = generateKey();
  const publicKey = generateKey();
  const address = generateAddress();

  const provisioning = await provisionWireGuardPeer(node.provisioningUrl!, node.provisioningKey!, {
    publicKey,
    address,
  });

  return createWireGuardPeer({
    deviceId,
    privateKey,
    publicKey,
    address,
    endpoint: provisioning.endpoint,
  });
}

export async function revokeWireGuardPeer(deviceId: string) {
  const peer = await findPeerByDevice(deviceId);

  if (!peer) {
    return null;
  }

  const device = await getDeviceWithNode(deviceId);
  const node = device.vpnAccess.vpnNode;

  if (node.provisioningUrl && node.provisioningKey) {
    await revokeProvisionedWireGuardPeer(
      node.provisioningUrl,
      node.provisioningKey,
      peer.publicKey,
    );
  }

  return peer;
}

export async function regenerateWireGuardConfig(userId: string, deviceId: string) {
  const peer = await prisma.wireGuardPeer.findUnique({
    where: {
      deviceId,
    },
    include: {
      device: {
        include: {
          vpnAccess: {
            include: {
              vpnNode: true,
              license: {
                include: {
                  subscription: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!peer) {
    throw createError(404, 'WireGuard peer not found');
  }

  if (peer.device.vpnAccess.license.subscription.userId !== userId) {
    throw createError(403, 'Forbidden');
  }

  const node = peer.device.vpnAccess.vpnNode;

  validateNode(node);

  if (node.provisioningUrl && node.provisioningKey) {
    await revokeProvisionedWireGuardPeer(
      node.provisioningUrl,
      node.provisioningKey,
      peer.publicKey,
    );
  }

  const privateKey = generateKey();
  const publicKey = generateKey();
  const address = generateAddress();

  const provisioning = await provisionWireGuardPeer(node.provisioningUrl!, node.provisioningKey!, {
    publicKey,
    address,
  });

  return updateWireGuardPeer(peer.id, {
    privateKey,
    publicKey,
    address,
    endpoint: provisioning.endpoint,
  });
}

export async function createWireGuardConfig(vpnAccessId: string) {
  const vpnAccess = await prisma.vPNAccess.findUnique({
    where: {
      id: vpnAccessId,
    },
    include: {
      vpnNode: true,
    },
  });

  if (!vpnAccess) {
    throw createError(404, 'VPN Access not found');
  }

  const node = vpnAccess.vpnNode;

  if (!node.active) {
    throw createError(503, 'VPN node is inactive');
  }

  if (!node.publicKey) {
    throw createError(503, 'VPN node public key is not configured');
  }

  return updateVPNAccessConfig(
    vpnAccessId,
    `wireguard://${Buffer.from(
      `[Interface]
PrivateKey = generated-by-device
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${node.publicKey}
Endpoint = ${node.hostname}:${node.port}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`,
    ).toString('base64')}`,
  );
}

export async function getWireGuardConfig(userId: string, deviceId: string) {
  const peer = await prisma.wireGuardPeer.findUnique({
    where: {
      deviceId,
    },
    include: {
      device: {
        include: {
          vpnAccess: {
            include: {
              vpnNode: true,
              license: {
                include: {
                  subscription: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!peer) {
    throw createError(404, 'WireGuard peer not found');
  }

  if (peer.device.vpnAccess.license.subscription.userId !== userId) {
    throw createError(403, 'Forbidden');
  }

  const node = peer.device.vpnAccess.vpnNode;

  if (!node.active) {
    throw createError(503, 'VPN node is inactive');
  }

  const endpoint = peer.endpoint ?? `${node.hostname}:${node.port}`;

  return `
[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.address}
DNS = 1.1.1.1

[Peer]
PublicKey = ${node.publicKey ?? peer.publicKey}
Endpoint = ${endpoint}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`.trim();
}
