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

export default async function adminRoutes(app: FastifyInstance) {
<<<<<<< HEAD
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/overview', { preHandler: guard }, adminOverview);
  app.get('/site-config', { preHandler: guard }, adminSiteConfig);
  app.put('/site-config', { preHandler: guard }, updateAdminSiteConfig);
  app.get('/ads', { preHandler: guard }, adminAds);
  app.post('/ads', { preHandler: guard }, createAdminAd);
  app.put('/ads/:id', { preHandler: guard }, updateAdminAd);
  app.delete('/ads/:id', { preHandler: guard }, deleteAdminAd);
  app.post('/ads/:id/publish', { preHandler: guard }, publishAdminAd);
  app.post('/ads/:id/unpublish', { preHandler: guard }, unpublishAdminAd);
  app.get('/roadmap', { preHandler: guard }, adminRoadmap);
  app.put('/roadmap/:id', { preHandler: guard }, updateAdminRoadmapPhase);
  await networkRoutes(app);
  await paymentAdminRoutes(app);
=======
  app.get('/overview', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async (request) => {
    const user = currentUser(request);
    const [users, subscriptions, products] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count(),
      prisma.product.count({ where: { active: true } }),
    ]);

    return {
      admin: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      stats: { users, subscriptions, activeProducts: products },
    };
  });

  app.get('/site-config', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async () =>
    getSiteConfig(app),
  );

  app.get('/roadmap', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async () =>
    getRoadmap(app),
  );

  app.put('/roadmap', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async (request) =>
    updateRoadmap(app, request.body as Roadmap),
  );

  app.put(
    '/site-config',
    { preHandler: [authMiddleware, requireRole('ADMIN')] },
    async (request) => {
      const body = request.body as Partial<SiteConfig> | undefined;

      if (!body || typeof body !== 'object') {
        throw createError(400, 'Invalid site configuration');
      }

      if (body.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(body.primaryColor)) {
        throw createError(400, 'primaryColor must be a 6-digit hex color');
      }

      return updateSiteConfig(app, body);
    },
  );
>>>>>>> d841946 (style: format admin and roadmap files)
}
