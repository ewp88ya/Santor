import { randomBytes } from 'node:crypto';

import { prisma } from '../../config/database.js';

import { createWireGuardPeer, findPeerByDevice } from './wireguard.repository.js';

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

export async function createWireGuardConfig(vpnAccessId: string) {
  const { config } = generateWireGuardConfig();

  const configUrl = `wireguard://${Buffer.from(config).toString('base64')}`;

  return updateVPNAccessConfig(vpnAccessId, configUrl);
}

export async function getWireGuardConfig(deviceId: string) {
  const peer = await prisma.wireGuardPeer.findUnique({
    where: {
      deviceId,
    },
    include: {
      device: {
        include: {
          vpnAccess: true,
        },
      },
    },
  });

  if (!peer) {
    throw new Error('WireGuard peer not found');
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
