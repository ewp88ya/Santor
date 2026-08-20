import createError from 'http-errors';

import {
  createVPNAccess,
  findVPNAccessByLicense,
  findVPNAccessOwnership,
  findActiveVPNNode,
} from './vpn-access.repository.js';

import { createWireGuardConfig } from '../wireguard/wireguard.service.js';

import { getVPNMode } from '../../config/vpn-mode.js';

export async function generateVPNAccess(licenseId: string) {
  const ownership = await findVPNAccessOwnership(licenseId);

  if (!ownership) {
    throw createError(404, 'License not found');
  }

  const mode = getVPNMode(ownership.subscription.product.code);

  if (mode !== 'wireguard') {
    throw createError(409, `VPN access provisioning is not supported for ${mode} mode`);
  }

  const existing = await findVPNAccessByLicense(licenseId);

  if (existing) {
    if (!existing.configUrl) {
      await createWireGuardConfig(existing.id);

      return findVPNAccessByLicense(licenseId);
    }

    return existing;
  }

  const vpnNode = await findActiveVPNNode();

  if (!vpnNode) {
    throw createError(503, 'No active VPN node available');
  }

  const vpnAccess = await createVPNAccess({
    licenseId,
    protocol: 'wireguard',
    vpnNodeId: vpnNode.id,
  });

  await createWireGuardConfig(vpnAccess.id);

  return findVPNAccessByLicense(licenseId);
}

export async function generateOwnedVPNAccess(licenseId: string, userId: string) {
  const ownership = await findVPNAccessOwnership(licenseId);

  if (!ownership) {
    throw createError(404, 'License not found');
  }

  if (ownership.subscription.userId !== userId) {
    throw createError(404, 'License not found');
  }

  return generateVPNAccess(licenseId);
}
