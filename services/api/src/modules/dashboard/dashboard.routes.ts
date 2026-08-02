import type { FastifyInstance } from 'fastify';

import { dashboard } from './dashboard.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: authMiddleware,
    },
    dashboard,
  );
}
