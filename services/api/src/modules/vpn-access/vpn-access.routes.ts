import type { FastifyInstance } from 'fastify';

import { createVPNAccessController } from './vpn-access.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';

export async function vpnAccessRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('vpn:read')],
    },
    createVPNAccessController,
  );
}
