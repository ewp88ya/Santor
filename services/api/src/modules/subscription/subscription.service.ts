import {
  createSubscription,
  findSubscriptionById,
  findUserSubscriptions,
} from "./subscription.repository.js";


export async function createUserSubscription(
  userId: string,
  productId: string,
) {
  return createSubscription({
    userId,
    productId,
  });
}


export async function getSubscription(
  id: string,
) {
  return findSubscriptionById(id);
}


export async function listUserSubscriptions(
  userId: string,
) {
  return findUserSubscriptions(userId);
}
