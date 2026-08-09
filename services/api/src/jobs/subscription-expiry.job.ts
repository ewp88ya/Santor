import { expireSubscriptions } from '../modules/subscription/subscription.expire.service.js';

export function startSubscriptionExpiryJob() {
  console.log('[JOB] Subscription expiry scheduler started');

  setInterval(
    async () => {
      try {
        const expired = await expireSubscriptions();

        console.log(`[JOB] Subscription expiry check completed. Expired: ${expired}`);
      } catch (error) {
        console.error('[JOB] Expiry check failed', error);
      }
    },
    60 * 60 * 1000,
  );
}
