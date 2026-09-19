import type { FastifyInstance } from 'fastify';

import { externalClientRateLimit } from '../../middleware/rate-limit.middleware.js';
import { telegramWebhookController } from './telegram.controller.js';
import { telegramWebhookSchema } from './telegram.schema.js';

export default async function telegramRoutes(app: FastifyInstance) {
  app.post(
    '/webhook',
    {
      schema: telegramWebhookSchema,
      preHandler: [externalClientRateLimit],
    },
    telegramWebhookController,
  );
}
