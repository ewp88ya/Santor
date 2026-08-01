import { FastifyInstance } from 'fastify';

import { createVPNAccessController } from './vpn-access.controller.js';

export async function vpnAccessRoutes(app: FastifyInstance) {
  app.post('/', async (request) => {
    return createVPNAccessController(
      request.body as {
        licenseId: string;
      },
    );
  });
}
