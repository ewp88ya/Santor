import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { activateEntitlementInTransaction } from '../entitlement/entitlement.service.js';
import { findLatestSuccessfulPaymentForSubscription } from './payment.repository.js';
import { routePaymentProvider } from './payment.router.js';
import { paymentProviders } from './payment.providers.js';
import type { PaymentMethod } from './providers/payment.provider.js';

const MAX_RENEWAL_ATTEMPTS = 3;
const GRACE_PERIOD_DAYS = 3;
const RENEWAL_CLAIM_MINUTES = 5;
const RETRY_DELAY_DAYS = 1;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMinutes(date: Date, minutes: number) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function normalizePaymentMethod(value: string | null | undefined): PaymentMethod | undefined {
  const normalized = value?.trim().toUpperCase();

  if (
    normalized === 'VISA' ||
    normalized === 'MASTERCARD' ||
    normalized === 'PAYPAL' ||
    normalized === 'QRIS' ||
    normalized === 'ALIPAY' ||
    normalized === 'WECHAT_PAY' ||
    normalized === 'SBP' ||
    normalized === 'MIR' ||
    normalized === 'CRYPTO'
  ) {
    return normalized;
  }

  return undefined;
}

function getProviderName(provider: { constructor: { name: string } }) {
  return provider.constructor.name;
}

async function enterRenewalGracePeriod(subscriptionId: string, reason: string) {
  const now = new Date();
  const gracePeriodEnd = addDays(now, GRACE_PERIOD_DAYS);

  await prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      gracePeriodEnd,
      nextRenewalAttemptAt: null,
    },
  });

  return gracePeriodEnd;
}

async function claimRenewal(
  subscriptionId: string,
  now: Date,
  renewalAttempts: number,
): Promise<boolean> {
  const claimUntil = addMinutes(now, RENEWAL_CLAIM_MINUTES);

  const claimed = await prisma.subscription.updateMany({
    where: {
      id: subscriptionId,
      autoDebitEnabled: true,
      status: 'active',
      renewalAttempts,
      endDate: {
        lte: now,
      },
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
    data: {
      nextRenewalAttemptAt: claimUntil,
    },
  });

  return claimed.count === 1;
}

async function clearRenewalClaim(subscriptionId: string) {
  await prisma.subscription.updateMany({
    where: {
      id: subscriptionId,
      autoDebitEnabled: true,
      status: 'active',
    },
    data: {
      nextRenewalAttemptAt: null,
    },
  });
}

export async function renewSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      id: subscriptionId,
    },
    include: {
      product: true,
      license: {
        include: {
          vpnAccess: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const auditUserId = subscription.userId;

  if (!subscription.autoDebitEnabled) {
    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.skipped',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'AUTO_DEBIT_DISABLED',
      },
    });

    return {
      renewed: false,
      reason: 'AUTO_DEBIT_DISABLED',
    };
  }

  const now = new Date();

  if (subscription.gracePeriodEnd && subscription.gracePeriodEnd > now) {
    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.skipped',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'GRACE_PERIOD_ACTIVE',
        gracePeriodEnd: subscription.gracePeriodEnd.toISOString(),
      },
    });

    return {
      renewed: false,
      reason: 'GRACE_PERIOD_ACTIVE',
      gracePeriodEnd: subscription.gracePeriodEnd,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  if (subscription.renewalAttempts >= MAX_RENEWAL_ATTEMPTS) {
    if (!subscription.gracePeriodEnd) {
      const gracePeriodEnd = await enterRenewalGracePeriod(
        subscriptionId,
        'MAX_RENEWAL_ATTEMPTS_REACHED',
      );

      await auditLog({
        userId: auditUserId,
        action: 'payment.renewal.grace_period',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
          attempts: subscription.renewalAttempts,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
        },
      });

      return {
        renewed: false,
        reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
        attempts: subscription.renewalAttempts,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        gracePeriodEnd,
      };
    }

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.skipped',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
        attempts: subscription.renewalAttempts,
        gracePeriodEnd: subscription.gracePeriodEnd.toISOString(),
      },
    });

    return {
      renewed: false,
      reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
      attempts: subscription.renewalAttempts,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      gracePeriodEnd: subscription.gracePeriodEnd,
    };
  }

  if (!subscription.paymentCustomerId || !subscription.paymentMethodId) {
    const gracePeriodEnd = await enterRenewalGracePeriod(
      subscriptionId,
      'PAYMENT_METHOD_NOT_CONFIGURED',
    );

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.grace_period',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'PAYMENT_METHOD_NOT_CONFIGURED',
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      },
    });

    return {
      renewed: false,
      reason: 'PAYMENT_METHOD_NOT_CONFIGURED',
      gracePeriodDays: GRACE_PERIOD_DAYS,
      gracePeriodEnd,
    };
  }

  const claimed = await claimRenewal(subscriptionId, now, subscription.renewalAttempts);

  if (!claimed) {
    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.skipped',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'RENEWAL_ALREADY_CLAIMED',
      },
    });

    return {
      renewed: false,
      reason: 'RENEWAL_ALREADY_CLAIMED',
    };
  }

  let claimReleased = false;

  try {
    const previousPayment = await findLatestSuccessfulPaymentForSubscription(subscriptionId);

    if (!previousPayment?.country || !previousPayment.paymentMethod) {
      const gracePeriodEnd = await enterRenewalGracePeriod(
        subscriptionId,
        'PAYMENT_ROUTING_CONTEXT_NOT_FOUND',
      );

      await auditLog({
        userId: auditUserId,
        action: 'payment.renewal.grace_period',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          reason: 'PAYMENT_ROUTING_CONTEXT_NOT_FOUND',
          gracePeriodEnd: gracePeriodEnd.toISOString(),
        },
      });

      claimReleased = true;

      return {
        renewed: false,
        reason: 'PAYMENT_ROUTING_CONTEXT_NOT_FOUND',
        gracePeriodDays: GRACE_PERIOD_DAYS,
        gracePeriodEnd,
      };
    }

    const country = previousPayment.country.trim().toUpperCase();
    const paymentMethod = normalizePaymentMethod(previousPayment.paymentMethod);

    if (!paymentMethod) {
      const gracePeriodEnd = await enterRenewalGracePeriod(
        subscriptionId,
        'PAYMENT_METHOD_NOT_SUPPORTED',
      );

      await auditLog({
        userId: auditUserId,
        action: 'payment.renewal.grace_period',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          reason: 'PAYMENT_METHOD_NOT_SUPPORTED',
          paymentId: previousPayment.id,
          paymentMethod: previousPayment.paymentMethod,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
        },
      });

      claimReleased = true;

      return {
        renewed: false,
        reason: 'PAYMENT_METHOD_NOT_SUPPORTED',
        gracePeriodDays: GRACE_PERIOD_DAYS,
        gracePeriodEnd,
      };
    }

    const paymentProvider = routePaymentProvider(
      country,
      paymentMethod,
      paymentProviders,
      previousPayment.currency,
    );

    const providerName = getProviderName(paymentProvider);

    const payment = await prisma.payment.create({
      data: {
        subscriptionId,
        provider: providerName,
        country,
        currency: previousPayment.currency,
        paymentMethod,
        amount: subscription.product.price,
        status: 'pending',
        type: 'renewal',
        autoDebit: true,
      },
    });

    let result;

    try {
      result = await paymentProvider.charge({
        customerId: subscription.paymentCustomerId,
        paymentMethodId: subscription.paymentMethodId,
        amount: subscription.product.price,
        currency: previousPayment.currency,
        country,
        paymentMethod,
        referenceId: payment.id,
      });
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'PAYMENT_PROVIDER_ERROR',
      };
    }

    if (!result.success) {
      const attempts = subscription.renewalAttempts + 1;
      const maxAttemptsReached = attempts >= MAX_RENEWAL_ATTEMPTS;

      const nextAttemptAt = maxAttemptsReached
        ? null
        : addDays(new Date(), RETRY_DELAY_DAYS);

      const gracePeriodEnd = maxAttemptsReached
        ? addDays(new Date(), GRACE_PERIOD_DAYS)
        : subscription.gracePeriodEnd;

      await prisma.$transaction([
        prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: 'failed',
            providerPaymentId: result.providerPaymentId,
            transactionId: result.transactionId,
          },
        }),

        prisma.subscription.update({
          where: {
            id: subscriptionId,
          },
          data: {
            renewalAttempts: attempts,
            gracePeriodEnd,
            nextRenewalAttemptAt: nextAttemptAt,
          },
        }),
      ]);

      await auditLog({
        userId: auditUserId,
        action: 'payment.renewal.failed',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          paymentId: payment.id,
          provider: providerName,
          country,
          paymentMethod,
          attempts,
          reason: result.error ?? 'PAYMENT_FAILED',
          maxAttemptsReached,
          nextRenewalAttemptAt: nextAttemptAt?.toISOString() ?? null,
          gracePeriodEnd: gracePeriodEnd?.toISOString() ?? null,
        },
      });

      claimReleased = true;

      return {
        renewed: false,
        reason: result.error ?? 'PAYMENT_FAILED',
        attempts,
        nextRenewalAttemptAt: nextAttemptAt,
        gracePeriodDays: maxAttemptsReached ? GRACE_PERIOD_DAYS : undefined,
        gracePeriodEnd,
      };
    }

    /*
     * Provider success is NOT sufficient by itself.
     *
     * The payment success, subscription renewal state and entitlement
     * activation MUST commit atomically.
     *
     * Provider calls remain outside the transaction.
     */
    const currentTime = new Date();
    const currentEndDate = subscription.endDate ?? currentTime;
    const baseDate = currentEndDate > currentTime ? currentEndDate : currentTime;
    const newEndDate = addDays(baseDate, subscription.product.durationDays);

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        /*
         * Re-read the payment inside the transaction.
         *
         * This prevents a concurrent webhook or worker from completing
         * the same renewal payment independently.
         */
        const currentPayment = await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
          select: {
            id: true,
            status: true,
            subscriptionId: true,
            providerPaymentId: true,
          },
        });

        if (!currentPayment) {
          throw new Error('Renewal payment not found');
        }

        if (currentPayment.status !== 'pending') {
          throw new Error('Renewal payment is no longer pending');
        }

        if (
          currentPayment.providerPaymentId &&
          result.providerPaymentId &&
          currentPayment.providerPaymentId !== result.providerPaymentId
        ) {
          throw new Error('Renewal provider payment ID mismatch');
        }

        /*
         * 1. Payment -> success
         */
        const updatedPayment = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: 'success',
            transactionId: result.transactionId,
            providerPaymentId: result.providerPaymentId,
          },
        });

        /*
         * 2. Entitlement activation uses the SAME transaction.
         *
         * If activation fails, payment success is rolled back.
         */
        await activateEntitlementInTransaction(subscriptionId, tx);

        /*
         * 3. Renewal-specific subscription state.
         *
         * This runs in the same transaction as entitlement activation.
         */
        const updatedSubscription = await tx.subscription.update({
          where: {
            id: subscriptionId,
          },
          data: {
            status: 'active',
            endDate: newEndDate,
            renewalAttempts: 0,
            gracePeriodEnd: null,
            nextRenewalAttemptAt: null,
          },
        });

        /*
         * 4. Explicitly ensure VPN access remains active for a renewed
         * entitlement when the license already owns VPN access.
         */
        if (subscription.license?.vpnAccess) {
          await tx.vPNAccess.update({
            where: {
              id: subscription.license.vpnAccess.id,
            },
            data: {
              active: true,
            },
          });
        }

        return {
          payment: updatedPayment,
          subscription: updatedSubscription,
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      },
    );

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.success',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        paymentId: transactionResult.payment.id,
        provider: providerName,
        country,
        paymentMethod,
        transactionId: result.transactionId,
        providerPaymentId: result.providerPaymentId,
        endDate: newEndDate.toISOString(),
        entitlementAtomic: true,
      },
    });

    claimReleased = true;

    return {
      renewed: true,
      subscriptionId,
      paymentId: transactionResult.payment.id,
      endDate: newEndDate,
      transactionId: result.transactionId,
    };
  } finally {
    if (!claimReleased) {
      try {
        await clearRenewalClaim(subscriptionId);
      } catch (error) {
        console.error(
          `[RENEWAL] Failed to release renewal claim for ${subscriptionId}`,
          error,
        );
      }
    }
  }
}
