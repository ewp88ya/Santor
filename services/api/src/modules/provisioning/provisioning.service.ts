import { createUserSubscription } from '../subscription/subscription.service.js';

import { generateLicense } from '../license/license.service.js';

export async function provisionUserAccess(userId: string, productId: string) {
  const subscription = await createUserSubscription(userId, productId);

  const license = await generateLicense(subscription.id);

  return {
    subscription,
    license,
  };
}
