import { createVPNAccess, findVPNAccessByLicense } from './vpn-access.repository.js';

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
