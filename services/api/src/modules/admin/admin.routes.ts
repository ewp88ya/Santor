import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { adminOverview, adminSiteConfig, updateAdminSiteConfig } from './admin.controller.js';

export default async function adminRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/overview', { preHandler: guard }, adminOverview);
  app.get('/site-config', { preHandler: guard }, adminSiteConfig);
  app.put('/site-config', { preHandler: guard }, updateAdminSiteConfig);
}
