import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  adminAds,
  createAdminAd,
  deleteAdminAd,
  publishAdminAd,
  unpublishAdminAd,
  updateAdminAd,
} from './ads.controller.js';

export default async function adminAdsRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/ads', { preHandler: guard }, adminAds);
  app.post('/ads', { preHandler: guard }, createAdminAd);
  app.put<{ Params: { id: string } }>('/ads/:id', { preHandler: guard }, updateAdminAd);
  app.delete<{ Params: { id: string } }>('/ads/:id', { preHandler: guard }, deleteAdminAd);
  app.post<{ Params: { id: string } }>('/ads/:id/publish', { preHandler: guard }, publishAdminAd);
  app.post<{ Params: { id: string } }>('/ads/:id/unpublish', { preHandler: guard }, unpublishAdminAd);
}
