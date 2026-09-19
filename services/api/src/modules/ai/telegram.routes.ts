import type { FastifyInstance } from 'fastify';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { externalClientRateLimit } from '../../middleware/rate-limit.middleware.js';
import { telegramLinkController, telegramWebhookController } from './telegram.controller.js';
import { telegramWebhookSchema } from './telegram.schema.js';

export default async function telegramRoutes(app: FastifyInstance) {
  app.post('/link', { preHandler: [authMiddleware, externalClientRateLimit] }, telegramLinkController);
  app.post('/webhook', { schema: telegramWebhookSchema, preHandler: [externalClientRateLimit] }, telegramWebhookController);
}
