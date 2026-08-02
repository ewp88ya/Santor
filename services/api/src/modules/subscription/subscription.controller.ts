import { expireSubscriptions } from './subscription.expire.service.js';

import {
  createUserSubscription,
  getSubscription,
  listUserSubscriptions,
} from './subscription.service.js';

export async function createSubscriptionController(request: any) {
  const { userId, productId } = request.body;

  return createUserSubscription(userId, productId);
}

export async function listSubscriptionController(request: any) {
  const { userId } = request.query;

  return listUserSubscriptions(userId);
}

export async function detailSubscriptionController(request: any) {
  const { id } = request.params;

  return getSubscription(id);
}

export async function expireSubscriptionJob() {
  const total = await expireSubscriptions();

  return {
    expired: total,
  };
}
