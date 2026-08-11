import { prisma } from '../config/database.js';
import { renewSubscription } from '../modules/payment/payment.renewal.service.js';
import type { PaymentProvider } from '../modules/payment/providers/payment.provider.js';

export function startSubscriptionRenewalJob(provider: PaymentProvider) {
  console.log('[JOB] Subscription renewal scheduler started');

  const run = async () => {
    try {
      const now = new Date();

      const subscriptions = await prisma.subscription.findMany({
        where: {
          autoDebitEnabled: true,
          status: 'active',
          endDate: {
            lte: now,
          },
          OR: [{ nextRenewalAttemptAt: null }, { nextRenewalAttemptAt: { lte: now } }],
        },
        select: {
          id: true,
        },
      });

      for (const subscription of subscriptions) {
        try {
          const result = await renewSubscription(subscription.id, provider);
          console.log(`[RENEWAL] ${subscription.id}:`, result);
        } catch (error) {
          console.error(`[RENEWAL] Failed for ${subscription.id}`, error);
        }
      }
    } catch (error) {
      console.error('[JOB] Renewal check failed', error);
    }
  };

  void run();

  setInterval(
    () => {
      void run();
    },
    15 * 60 * 1000,
  );
}
