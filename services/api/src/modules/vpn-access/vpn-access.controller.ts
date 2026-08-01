import { generateVPNAccess } from './vpn-access.service.js';

export async function createVPNAccessController(body: { licenseId: string }) {
  return generateVPNAccess(body.licenseId);
}
