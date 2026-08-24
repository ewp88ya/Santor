import type { FastifyInstance } from 'fastify';

import {
  createPaymentController,
  detailPaymentController,
  disableAutoDebitController,
  enableAutoDebitController,
  listPaymentController,
  paymentSuccessController,
  paymentWebhookController,
  plategaWebhookController,
  refundPaymentController,
  xenditWebhookController,
} from './payment.controller.js';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { paymentRateLimit } from '../../middleware/rate-limit.middleware.js';

export default async function paymentRoutes(app: FastifyInstance) {
  app.get('/payments', { preHandler: [authMiddleware, paymentRateLimit] }, listPaymentController);
  app.get(
    '/payments/:id',
    { preHandler: [authMiddleware, paymentRateLimit] },
    detailPaymentController,
  );
  app.post(
    '/payments',
    { preHandler: [authMiddleware, paymentRateLimit] },
    createPaymentController,
  );
  app.patch(
    '/payments/:id/success',
    { preHandler: [authMiddleware, paymentRateLimit] },
    paymentSuccessController,
  );
  app.post(
    '/payments/:id/refund',
    { preHandler: [authMiddleware, paymentRateLimit] },
    refundPaymentController,
  );

  app.post('/payments/webhook', paymentWebhookController);
  app.post('/payments/webhook/xendit', xenditWebhookController);
  app.post('/payments/webhook/platega', plategaWebhookController);

  app.post(
    '/payments/autodebit/enable',
    { preHandler: [authMiddleware, paymentRateLimit] },
    enableAutoDebitController,
  );
  app.post(
    '/payments/autodebit/disable',
    { preHandler: [authMiddleware, paymentRateLimit] },
    disableAutoDebitController,
  );
}
