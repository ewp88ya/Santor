import type { FastifyRequest } from 'fastify';

import { generateOwnedVPNAccess } from './vpn-access.service.js';

export async function createVPNAccessController(request: FastifyRequest) {
  const user = request.user as { id?: string };

  if (!user?.id) {
    throw new Error('Invalid user');
  }

  const body = request.body as {
    licenseId: string;
  };

  return generateOwnedVPNAccess(body.licenseId, user.id);
}
