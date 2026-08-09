import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import { expireSubscriptions } from './subscription.expire.service.js';

import {
  createUserSubscription,
  getSubscription,
  listUserSubscriptions,
  activateUserSubscription,
  cancelUserSubscription,
} from './subscription.service.js';

function getUserId(request: FastifyRequest) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  return user.id;
}

export async function createSubscriptionController(request: FastifyRequest) {
  const userId = getUserId(request);

  const body = request.body as {
    productId: string;
  };

  return createUserSubscription(userId, body.productId);
}

export async function listSubscriptionController(request: FastifyRequest) {
  const userId = getUserId(request);

  return listUserSubscriptions(userId);
}

export async function detailSubscriptionController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  const subscription = await getSubscription(params.id);

  if (!subscription) {
    throw createError(404, 'Subscription not found');
  }

  if (subscription.userId !== userId) {
    throw createError(403, 'Forbidden');
  }

  return subscription;
}

export async function activateSubscriptionController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  return activateUserSubscription(userId, params.id);
}

export async function cancelSubscriptionController(request: FastifyRequest) {
  const userId = getUserId(request);

  const params = request.params as {
    id: string;
  };

  return cancelUserSubscription(userId, params.id);
}

export async function expireSubscriptionJob() {
  const total = await expireSubscriptions();

  return {
    expired: total,
  };
}
