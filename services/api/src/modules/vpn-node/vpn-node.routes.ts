import type { FastifyInstance } from 'fastify';

import {
  createVPNNodeController,
  getVPNNodeController,
  listVPNNodesController,
  toggleVPNNodeController,
  updateVPNNodeController,
} from './vpn-node.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';

export async function vpnNodeRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('vpn-node:read')],
    },
    listVPNNodesController,
  );

  app.get(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('vpn-node:read')],
    },
    getVPNNodeController,
  );

  app.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('vpn-node:create')],
    },
    createVPNNodeController,
  );

  app.patch(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('vpn-node:update')],
    },
    updateVPNNodeController,
  );

  app.patch(
    '/:id/status',
    {
      preHandler: [authMiddleware, requirePermission('vpn-node:update')],
    },
    toggleVPNNodeController,
  );
}
