import { prisma } from '../config/database.js';
import { renewSubscription } from '../modules/payment/payment.renewal.service.js';

const RENEWAL_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RENEWAL_ATTEMPTS = 3;

let renewalJobStarted = false;
let renewalRunInProgress = false;

export function startSubscriptionRenewalJob() {
  if (renewalJobStarted) {
    console.warn('[JOB] Subscription renewal scheduler already started');
    return;
  }

  renewalJobStarted = true;

  console.log('[JOB] Subscription renewal scheduler started');

  const run = async () => {
    if (renewalRunInProgress) {
      console.warn('[JOB] Previous renewal check is still running');
      return;
    }

    renewalRunInProgress = true;

    try {
      const now = new Date();

      /*
       * Only select subscriptions that are genuinely eligible for
       * another renewal attempt.
       *
       * Important:
       * - active grace periods are excluded
       * - subscriptions at maximum attempts are excluded
       * - disabled auto-debit is excluded
       */
      const subscriptions = await prisma.subscription.findMany({
        where: {
          autoDebitEnabled: true,
          status: 'active',
          renewalAttempts: {
            lt: MAX_RENEWAL_ATTEMPTS,
          },
          endDate: {
            lte: now,
          },
          AND: [
            {
              OR: [
                {
                  gracePeriodEnd: null,
                },
                {
                  gracePeriodEnd: {
                    lte: now,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  nextRenewalAttemptAt: null,
                },
                {
                  nextRenewalAttemptAt: {
                    lte: now,
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (subscriptions.length === 0) {
        return;
      }

      console.log(`[JOB] Found ${subscriptions.length} subscriptions due for renewal`);

      for (const subscription of subscriptions) {
        try {
          const result = await renewSubscription(subscription.id);

          console.log(`[RENEWAL] ${subscription.id}:`, result);
        } catch (error) {
          /*
           * One broken subscription must never stop the entire scheduler.
           */
          console.error(`[RENEWAL] Failed for ${subscription.id}`, error);
        }
      }
    } catch (error) {
      console.error('[JOB] Renewal check failed', error);
    } finally {
      renewalRunInProgress = false;
    }
  };

  void run();

  setInterval(() => {
    void run();
  }, RENEWAL_INTERVAL_MS);
}
