import type { FastifyInstance } from 'fastify';

import {
  createSubscriptionController,
  listSubscriptionController,
  detailSubscriptionController,
  expireSubscriptionJob,
} from './subscription.controller.js';

export default async function subscriptionRoutes(app: FastifyInstance) {
  app.post('/subscriptions', createSubscriptionController);

  app.get('/subscriptions', listSubscriptionController);

  app.get('/subscriptions/:id', detailSubscriptionController);

  app.post('/subscriptions/expire-check', expireSubscriptionJob);
}
