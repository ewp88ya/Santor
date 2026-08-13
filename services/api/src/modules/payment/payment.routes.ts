import type { FastifyInstance } from 'fastify';

import {
  createPaymentController,
  detailPaymentController,
  disableAutoDebitController,
  enableAutoDebitController,
  listPaymentController,
  paymentSuccessController,
  paymentWebhookController,
  xenditWebhookController,
} from './payment.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { paymentRateLimit } from '../../middleware/rate-limit.middleware.js';

export default async function paymentRoutes(app: FastifyInstance) {
  app.get(
    '/payments',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    listPaymentController,
  );

  app.get(
    '/payments/:id',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    detailPaymentController,
  );

  app.post(
    '/payments',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    createPaymentController,
  );

  app.patch(
    '/payments/:id/success',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    paymentSuccessController,
  );

  /*
   * Normalized/internal payment webhook.
   *
   * Intentionally unauthenticated because provider
   * webhooks do not use Santor JWT authentication.
   */
  app.post('/payments/webhook', paymentWebhookController);

  /*
   * Xendit webhook.
   *
   * Authentication:
   * x-callback-token
   *
   * The webhook is only a trigger.
   * The actual payment status is reconciled against
   * Xendit's Payment Request API.
   */
  app.post('/payments/webhook/xendit', xenditWebhookController);

  app.post(
    '/payments/autodebit/enable',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    enableAutoDebitController,
  );

  app.post(
    '/payments/autodebit/disable',
    {
      preHandler: [authMiddleware, paymentRateLimit],
    },
    disableAutoDebitController,
  );
}
