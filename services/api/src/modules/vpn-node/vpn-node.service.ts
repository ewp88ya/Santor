import createError from 'http-errors';

import {
  createVPNNode,
  findVPNNodeById,
  listVPNNodes,
  updateVPNNode,
} from './vpn-node.repository.js';

export async function getVPNNodes() {
  return listVPNNodes();
}

export async function getVPNNode(id: string) {
  const node = await findVPNNodeById(id);

  if (!node) {
    throw createError(404, 'VPN node not found');
  }

  return node;
}

export async function addVPNNode(data: {
  name: string;
  hostname: string;
  port?: number;
  protocol?: string;
  publicKey?: string;
  provisioningUrl?: string;
  provisioningKey?: string;
}) {
  const protocol = data.protocol ?? 'wireguard';

  if (protocol === 'wireguard') {
    if (!data.publicKey) {
      throw createError(400, 'WireGuard public key is required');
    }

    if (!data.provisioningUrl) {
      throw createError(400, 'VPN node provisioning URL is required');
    }

    if (!data.provisioningKey) {
      throw createError(400, 'VPN node provisioning key is required');
    }
  }

  return createVPNNode({
    name: data.name,
    hostname: data.hostname,
    port: data.port ?? 51820,
    protocol,
    publicKey: data.publicKey,
    provisioningUrl: data.provisioningUrl,
    provisioningKey: data.provisioningKey,
  });
}

export async function editVPNNode(
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
  const node = await findVPNNodeById(id);

  if (!node) {
    throw createError(404, 'VPN node not found');
  }

  const protocol = data.protocol ?? node.protocol;

  if (protocol === 'wireguard') {
    if (data.publicKey !== undefined && !data.publicKey) {
      throw createError(400, 'WireGuard public key cannot be empty');
    }

    if (data.provisioningUrl !== undefined && !data.provisioningUrl) {
      throw createError(400, 'VPN node provisioning URL cannot be empty');
    }

    if (data.provisioningKey !== undefined && !data.provisioningKey) {
      throw createError(400, 'VPN node provisioning key cannot be empty');
    }
  }

  return updateVPNNode(id, data);
}

export async function setVPNNodeStatus(id: string, active: boolean) {
  const node = await findVPNNodeById(id);

  if (!node) {
    throw createError(404, 'VPN node not found');
  }

  if (!active && node._count.vpnAccesses > 0) {
    // Existing VPNAccess records remain valid.
    // Disabling the node prevents future assignment.
  }

  return updateVPNNode(id, {
    active,
  });
}
