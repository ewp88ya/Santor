import type { FastifyInstance } from 'fastify';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { dashboardRateLimit } from '../../middleware/rate-limit.middleware.js';
import { aiChatController } from './ai.controller.js';
import { aiChatBodySchema } from './ai.schema.js';

export default async function aiRoutes(app: FastifyInstance) {
  app.post(
    '/chat',
    {
      schema: aiChatBodySchema,
      preHandler: [authMiddleware, requirePermission('ai:chat'), dashboardRateLimit],
    },
    aiChatController,
  );
}
