import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { findLatestSuccessfulPaymentForSubscription } from './payment.repository.js';
import { routePaymentProvider } from './payment.router.js';
import { paymentProviders } from './payment.providers.js';
import type { PaymentMethod } from './providers/payment.provider.js';

const MAX_RENEWAL_ATTEMPTS = 3;
const GRACE_PERIOD_DAYS = 3;
const RENEWAL_CLAIM_MINUTES = 5;

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
    normalized === 'QRIS' ||
    normalized === 'ALIPAY' ||
    normalized === 'WECHAT_PAY' ||
    normalized === 'SBP' ||
    normalized === 'MIR'
  ) {
    return normalized;
  }

  return undefined;
}

function getProviderName(provider: { constructor: { name: string } }) {
  return provider.constructor.name;
}

async function enterRenewalGracePeriod(subscriptionId: string) {
  const now = new Date();

  await prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      gracePeriodEnd: addDays(now, GRACE_PERIOD_DAYS),
      nextRenewalAttemptAt: null,
    },
  });
}

/**
 * Claims the renewal window atomically.
 *
 * This prevents two scheduler instances from charging the same
 * subscription concurrently.
 *
 * The temporary five-minute claim is cleared on success/failure.
 * If the process crashes during provider execution, the claim expires
 * naturally and the scheduler can retry it.
 */
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

  if (!subscription.paymentCustomerId || !subscription.paymentMethodId) {
    await enterRenewalGracePeriod(subscriptionId);

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.grace_period',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'PAYMENT_METHOD_NOT_CONFIGURED',
      },
    });

    return {
      renewed: false,
      reason: 'PAYMENT_METHOD_NOT_CONFIGURED',
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  if (subscription.renewalAttempts >= MAX_RENEWAL_ATTEMPTS) {
    await enterRenewalGracePeriod(subscriptionId);

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.grace_period',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
        attempts: subscription.renewalAttempts,
      },
    });

    return {
      renewed: false,
      reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  const now = new Date();

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

  const previousPayment = await findLatestSuccessfulPaymentForSubscription(subscriptionId);

  if (!previousPayment?.country || !previousPayment.paymentMethod) {
    await enterRenewalGracePeriod(subscriptionId);

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.grace_period',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'PAYMENT_ROUTING_CONTEXT_NOT_FOUND',
      },
    });

    return {
      renewed: false,
      reason: 'PAYMENT_ROUTING_CONTEXT_NOT_FOUND',
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  const country = previousPayment.country.trim().toUpperCase();
  const paymentMethod = normalizePaymentMethod(previousPayment.paymentMethod);

  if (!paymentMethod) {
    await enterRenewalGracePeriod(subscriptionId);

    await auditLog({
      userId: auditUserId,
      action: 'payment.renewal.grace_period',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        reason: 'PAYMENT_METHOD_NOT_SUPPORTED',
        paymentId: previousPayment.id,
        paymentMethod: previousPayment.paymentMethod,
      },
    });

    return {
      renewed: false,
      reason: 'PAYMENT_METHOD_NOT_SUPPORTED',
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  const paymentProvider = routePaymentProvider(country, paymentMethod, paymentProviders);
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

    await prisma.$transaction([
      prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'failed',
          providerPaymentId: result.providerPaymentId,
        },
      }),
      prisma.subscription.update({
        where: {
          id: subscriptionId,
        },
        data: {
          renewalAttempts: attempts,
          gracePeriodEnd: maxAttemptsReached
            ? addDays(new Date(), GRACE_PERIOD_DAYS)
            : subscription.gracePeriodEnd,
          nextRenewalAttemptAt: maxAttemptsReached ? null : addDays(new Date(), 1),
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
      },
    });

    return {
      renewed: false,
      reason: result.error ?? 'PAYMENT_FAILED',
      attempts,
      gracePeriodDays: maxAttemptsReached ? GRACE_PERIOD_DAYS : undefined,
    };
  }

  const currentTime = new Date();
  const currentEndDate = subscription.endDate ?? currentTime;
  const baseDate = currentEndDate > currentTime ? currentEndDate : currentTime;
  const newEndDate = addDays(baseDate, subscription.product.durationDays);

  await prisma.$transaction([
    prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'success',
        transactionId: result.transactionId,
        providerPaymentId: result.providerPaymentId,
      },
    }),
    prisma.subscription.update({
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
    }),
    ...(subscription.license?.vpnAccess
      ? [
          prisma.vPNAccess.update({
            where: {
              id: subscription.license.vpnAccess.id,
            },
            data: {
              active: true,
            },
          }),
        ]
      : []),
  ]);

  await auditLog({
    userId: auditUserId,
    action: 'payment.renewal.success',
    resource: 'subscription',
    resourceId: subscriptionId,
    metadata: {
      paymentId: payment.id,
      provider: providerName,
      country,
      paymentMethod,
      transactionId: result.transactionId,
      endDate: newEndDate.toISOString(),
    },
  });

  return {
    renewed: true,
    subscriptionId,
    endDate: newEndDate,
    transactionId: result.transactionId,
  };
}
