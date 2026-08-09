import type { FastifyInstance } from 'fastify';

import { dashboard } from './dashboard.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { dashboardRateLimit } from '../../middleware/rate-limit.middleware.js';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('dashboard:read'), dashboardRateLimit],
    },
    dashboard,
  );
}
