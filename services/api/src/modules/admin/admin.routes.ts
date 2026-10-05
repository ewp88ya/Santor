import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { adminOverview, adminSiteConfig, updateAdminSiteConfig } from './admin.controller.js';
import {
  adminAds,
  createAdminAd,
  deleteAdminAd,
  publishAdminAd,
  unpublishAdminAd,
  updateAdminAd,
} from './ads.controller.js';
import { adminRoadmap, updateAdminRoadmapPhase } from './roadmap.controller.js';
import networkRoutes from './network.routes.js';
import paymentAdminRoutes from './payment.routes.js';
import customerAdminRoutes from './customers.routes.js';

export default async function adminRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/overview', { preHandler: guard }, adminOverview);
  app.get('/site-config', { preHandler: guard }, adminSiteConfig);
  app.put('/site-config', { preHandler: guard }, updateAdminSiteConfig);
  app.get('/ads', { preHandler: guard }, adminAds);
  app.post('/ads', { preHandler: guard }, createAdminAd);
  app.put<{ Params: { id: string } }>('/ads/:id', { preHandler: guard }, updateAdminAd);
  app.delete<{ Params: { id: string } }>('/ads/:id', { preHandler: guard }, deleteAdminAd);
  app.post<{ Params: { id: string } }>('/ads/:id/publish', { preHandler: guard }, publishAdminAd);
  app.post<{ Params: { id: string } }>(
    '/ads/:id/unpublish',
    { preHandler: guard },
    unpublishAdminAd,
  );
  app.get('/roadmap', { preHandler: guard }, adminRoadmap);
  app.put<{ Params: { id: string } }>(
    '/roadmap/:id',
    { preHandler: guard },
    updateAdminRoadmapPhase,
  );
  await networkRoutes(app);
  await paymentAdminRoutes(app);
  await customerAdminRoutes(app);
}
