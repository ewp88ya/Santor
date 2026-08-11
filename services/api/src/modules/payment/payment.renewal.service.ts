import { prisma } from '../../config/database.js';
import type { PaymentProvider } from './providers/payment.provider.js';
import { auditLog } from '../audit/audit.service.js';

const MAX_RENEWAL_ATTEMPTS = 3;
const GRACE_PERIOD_DAYS = 3;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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

export async function renewSubscription(subscriptionId: string, provider: PaymentProvider) {
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
      metadata: { reason: 'AUTO_DEBIT_DISABLED' },
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
      metadata: { reason: 'PAYMENT_METHOD_NOT_CONFIGURED' },
    });

    return {
      renewed: false,
      reason: 'PAYMENT_METHOD_NOT_CONFIGURED',
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  if (subscription.renewalAttempts >= MAX_RENEWAL_ATTEMPTS) {
    return {
      renewed: false,
      reason: 'MAX_RENEWAL_ATTEMPTS_REACHED',
    };
  }

  const payment = await prisma.payment.create({
    data: {
      subscriptionId,
      provider: 'configured',
      amount: subscription.product.price,
      currency: subscription.product.currency,
      status: 'pending',
      type: 'renewal',
      autoDebit: true,
    },
  });

  const result = await provider.charge({
    customerId: subscription.paymentCustomerId,
    paymentMethodId: subscription.paymentMethodId,
    amount: subscription.product.price,
    currency: subscription.product.currency,
    referenceId: payment.id,
  });

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

  const now = new Date();
  const currentEndDate = subscription.endDate ?? now;
  const baseDate = currentEndDate > now ? currentEndDate : now;
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
