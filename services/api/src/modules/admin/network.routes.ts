import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  adminNetwork,
  createAdminBypass,
  createAdminServer,
  updateAdminServer,
  createAdminClient,
  createAdminTunnel,
  deleteAdminNetworkItem,
  updateAdminBypass,
  updateAdminClient,
  updateAdminTunnel,
} from './network.controller.js';

export default async function networkRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/network', { preHandler: guard }, adminNetwork);
  app.post('/network/servers', { preHandler: guard }, createAdminServer);
  app.put<{ Params: { id: string } }>('/network/servers/:id', { preHandler: guard }, updateAdminServer);
  app.post('/network/tunnels', { preHandler: guard }, createAdminTunnel);
  app.put<{ Params: { id: string } }>(
    '/network/tunnels/:id',
    { preHandler: guard },
    updateAdminTunnel,
  );
  app.post('/network/clients', { preHandler: guard }, createAdminClient);
  app.put<{ Params: { id: string } }>(
    '/network/clients/:id',
    { preHandler: guard },
    updateAdminClient,
  );
  app.post('/network/bypass', { preHandler: guard }, createAdminBypass);
  app.put<{ Params: { id: string } }>(
    '/network/bypass/:id',
    { preHandler: guard },
    updateAdminBypass,
  );
  app.delete<{ Params: { type: string; id: string } }>(
    '/network/:type/:id',
    { preHandler: guard },
    deleteAdminNetworkItem,
  );
}
