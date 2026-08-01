import { updateVPNAccessConfig } from './wireguard.repository.js';

import { generateWireGuardConfig } from './wireguard.generator.js';

export async function createWireGuardConfig(vpnAccessId: string) {
  const { config } = generateWireGuardConfig();

  const configUrl = `wireguard://${Buffer.from(config).toString('base64')}`;

  return updateVPNAccessConfig(vpnAccessId, configUrl);
}
