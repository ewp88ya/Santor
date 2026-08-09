import { randomBytes } from 'node:crypto';

import createError from 'http-errors';

import { prisma } from '../../config/database.js';

import {
  createWireGuardPeer,
  findPeerByDevice,
  updateWireGuardPeer,
} from './wireguard.repository.js';

import { updateVPNAccessConfig } from '../vpn-access/vpn-access.repository.js';

import { generateWireGuardConfig } from './wireguard.generator.js';

function generateKey() {
  return randomBytes(16).toString('hex');
}

export async function generateWireGuardPeer(deviceId: string) {
  const existing = await findPeerByDevice(deviceId);

  if (existing) {
    return existing;
  }

  return createWireGuardPeer({
    deviceId,
    privateKey: generateKey(),
    publicKey: generateKey(),
    address: `10.0.0.${Math.floor(Math.random() * 200) + 2}/32`,
    endpoint: 'node-1.santor.app:51820',
  });
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

  return updateWireGuardPeer(peer.id, {
    privateKey: generateKey(),
    publicKey: generateKey(),
    address: `10.0.0.${Math.floor(Math.random() * 200) + 2}/32`,
    endpoint: 'node-1.santor.app:51820',
  });
}

export async function createWireGuardConfig(vpnAccessId: string) {
  const { config } = generateWireGuardConfig();

  const configUrl = `wireguard://${Buffer.from(config).toString('base64')}`;

  return updateVPNAccessConfig(vpnAccessId, configUrl);
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

  return `
[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.address}
DNS = 1.1.1.1

[Peer]
PublicKey = ${peer.publicKey}
Endpoint = ${peer.endpoint}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`.trim();
}
