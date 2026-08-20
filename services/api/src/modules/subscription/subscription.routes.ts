import type { FastifyInstance } from 'fastify';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';

import {
  createSubscriptionController,
  listSubscriptionController,
  detailSubscriptionController,
  cancelSubscriptionController,
  expireSubscriptionJob,
} from './subscription.controller.js';

export default async function subscriptionRoutes(app: FastifyInstance) {
  app.post(
    '/subscriptions',
    {
      preHandler: [authMiddleware, requirePermission('subscription:create')],
    },
    createSubscriptionController,
  );

  app.get(
    '/subscriptions',
    {
      preHandler: [authMiddleware, requirePermission('subscription:read')],
    },
    listSubscriptionController,
  );

  app.get(
    '/subscriptions/:id',
    {
      preHandler: [authMiddleware, requirePermission('subscription:read')],
    },
    detailSubscriptionController,
  );

  app.post(
    '/subscriptions/:id/cancel',
    {
      preHandler: [authMiddleware, requirePermission('subscription:cancel')],
    },
    cancelSubscriptionController,
  );

  app.post('/subscriptions/expire-check', expireSubscriptionJob);
}
