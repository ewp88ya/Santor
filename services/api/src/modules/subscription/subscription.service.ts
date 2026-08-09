import createError from 'http-errors';

import {
  createSubscription,
  findSubscriptionById,
  findUserSubscriptions,
  activateSubscription,
  cancelSubscription,
} from './subscription.repository.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['expired', 'cancelled'],
  expired: [],
  cancelled: [],
};

export async function createUserSubscription(userId: string, productId: string) {
  return createSubscription({
    userId,
    productId,
  });
}

export async function getSubscription(id: string) {
  return findSubscriptionById(id);
}

export async function listUserSubscriptions(userId: string) {
  return findUserSubscriptions(userId);
}

export async function activateUserSubscription(userId: string, subscriptionId: string) {
  const subscription = await findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw createError(404, 'Subscription not found');
  }

  if (subscription.userId !== userId) {
    throw createError(403, 'Forbidden');
  }

  const allowed = VALID_TRANSITIONS[subscription.status] ?? [];

  if (!allowed.includes('active')) {
    throw createError(409, `Invalid subscription transition: ${subscription.status} -> active`);
  }

  return activateSubscription(subscriptionId);
}

export async function cancelUserSubscription(userId: string, subscriptionId: string) {
  const subscription = await findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw createError(404, 'Subscription not found');
  }

  if (subscription.userId !== userId) {
    throw createError(403, 'Forbidden');
  }

  const allowed = VALID_TRANSITIONS[subscription.status] ?? [];

  if (!allowed.includes('cancelled')) {
    throw createError(409, `Invalid subscription transition: ${subscription.status} -> cancelled`);
  }

  return cancelSubscription(subscriptionId);
}
