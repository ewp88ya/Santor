import createError from 'http-errors';

import {
  createVPNAccess,
  findVPNAccessByLicense,
  findVPNAccessOwnership,
} from './vpn-access.repository.js';

import { createWireGuardConfig } from '../wireguard/wireguard.service.js';

export async function generateVPNAccess(licenseId: string) {
  const existing = await findVPNAccessByLicense(licenseId);

  if (existing) {
    if (!existing.configUrl) {
      await createWireGuardConfig(existing.id);

      return findVPNAccessByLicense(licenseId);
    }

    return existing;
  }

  const vpnAccess = await createVPNAccess({
    licenseId,
    protocol: 'wireguard',
    serverNode: 'node-1',
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
