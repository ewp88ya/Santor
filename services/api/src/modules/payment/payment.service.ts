import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import {
  activateEntitlement,
  activateEntitlementInTransaction,
} from '../entitlement/entitlement.service.js';
import { auditLog } from '../audit/audit.service.js';

import {
  createPayment,
  findPaymentByIdForUser,
  listPayments,
  updatePaymentProvider,
  updatePaymentStatus,
  updateSubscriptionAutoDebit,
} from './payment.repository.js';

import { routePaymentProvider } from './payment.router.js';
import type { PaymentMethod } from './providers/payment.provider.js';

import {
  GlobalCardAdapter,
  PayPalAdapter,
  XenditAdapter,
  RussiaPaymentAdapter,
} from './providers/index.js';

const globalCardAdapter = new GlobalCardAdapter();
const paypalAdapter = new PayPalAdapter();
const xenditAdapter = new XenditAdapter();
const russiaPaymentAdapter = new RussiaPaymentAdapter();

function getPaymentProvider(country: string, paymentMethod: PaymentMethod, currency: string) {
  return routePaymentProvider(country, paymentMethod, {
    globalCard: globalCardAdapter,
    paypal: paypalAdapter,
    xendit: xenditAdapter,
    russia: russiaPaymentAdapter,
  });
}

export async function createNewPayment(data: {
  userId: string;
  subscriptionId: string;
  country: string;
  currency: string;
  paymentMethod: PaymentMethod;
  settlementCurrency?: string;
  autoDebit?: boolean;
}) {
  try {
    const normalizedCountry = data.country.trim().toUpperCase();
    const normalizedCurrency = data.currency.trim().toUpperCase();

    const paymentProvider = getPaymentProvider(
      normalizedCountry,
      data.paymentMethod,
      normalizedCurrency,
    );

    const payment = await createPayment({
      subscriptionId: data.subscriptionId,
      provider: paymentProvider.constructor.name,
      country: normalizedCountry,
      currency: normalizedCurrency,
      paymentMethod: data.paymentMethod,
      settlementCurrency: data.settlementCurrency ?? undefined,
      autoDebit: data.autoDebit ?? false,
    });

    if (!payment) {
      throw createError(404, 'Payment not found');
    }

    if (payment.subscription.userId !== data.userId) {
      throw createError(403, 'Forbidden');
    }

    const paymentMethodId = payment.paymentMethod?.trim();

    if (!paymentMethodId) {
      throw createError(400, 'Payment method ID is required');
    }

    const paymentCountry = payment.country?.trim().toUpperCase();

    if (!paymentCountry) {
      throw createError(400, 'Payment country is required');
    }

    const chargeResult = await paymentProvider.charge({
      customerId: payment.subscription.userId,
      paymentMethodId,
      amount: payment.amount,
      currency: payment.currency,
      country: paymentCountry,
      paymentMethod: paymentMethodId as PaymentMethod,
      referenceId: payment.id,
    });

    if (!chargeResult.success) {
      await updatePaymentStatus(payment.id, 'failed');

      await auditLog({
        userId: data.userId,
        action: 'PAYMENT_PROVIDER_FAILED',
        resource: 'payment',
        resourceId: payment.id,
        metadata: {
          provider: payment.provider,
          error: chargeResult.error,
        },
      });

      throw createError(502, chargeResult.error ?? 'Payment provider request failed');
    }

    const updatedPayment = await updatePaymentProvider(payment.id, {
      providerPaymentId: chargeResult.providerPaymentId ?? undefined,
      transactionId: chargeResult.transactionId ?? undefined,
      settlementCurrency: chargeResult.settlementCurrency ?? undefined,
    });

    await auditLog({
      userId: data.userId,
      action: 'PAYMENT_CREATED',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        provider: payment.provider,
        country: payment.country,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        settlementCurrency:
          chargeResult.settlementCurrency ?? payment.settlementCurrency ?? undefined,
        autoDebit: payment.autoDebit,
        providerPaymentId: chargeResult.providerPaymentId ?? undefined,
        transactionId: chargeResult.transactionId ?? undefined,
      },
    });

    return {
      payment: updatedPayment,
      provider: {
        name: payment.provider,
        paymentId: chargeResult.providerPaymentId ?? undefined,
        transactionId: chargeResult.transactionId ?? undefined,
        actions: chargeResult.actions ?? [],
      },
    };
  } catch (error: any) {
    if (error.message === 'Subscription already active') {
      const err = createError(409, 'Subscription already active');

      err.code = 'SUBSCRIPTION_ACTIVE';

      throw err;
    }

    if (error.message === 'Subscription not found') {
      throw createError(404, 'Subscription not found');
    }

    if (typeof error.message === 'string' && error.message.startsWith('No active price found')) {
      throw createError(400, error.message);
    }

    throw error;
  }
}

export async function getPayment(id: string, userId: string) {
  const payment = await findPaymentByIdForUser(id, userId);

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  return payment;
}

export async function getPayments(userId: string) {
  return listPayments(userId);
}

/**
 * Mark a payment as successful only after independent provider verification.
 *
 * IMPORTANT:
 *
 * The final payment lifecycle is executed inside ONE Serializable
 * Prisma transaction:
 *
 *   payment -> success
 *        ↓
 *   subscription -> active
 *        ↓
 *   license -> active
 *        ↓
 *   VPN access
 *
 * If any database operation in the entitlement lifecycle fails,
 * the payment success mutation is rolled back as well.
 *
 * Provider verification itself remains OUTSIDE the transaction because
 * external network calls must never be held inside a database transaction.
 */
export async function markPaymentSuccess(id: string, transactionId: string, userId: string) {
  const payment = await findPaymentByIdForUser(id, userId);

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  if (payment.status !== 'pending') {
    throw createError(409, 'Payment is not pending');
  }

  if (!payment.providerPaymentId) {
    throw createError(409, 'Payment does not have a provider payment ID');
  }

  if (!payment.country) {
    throw createError(409, 'Payment does not have a country');
  }

  const paymentProvider = getPaymentProvider(
    payment.country,
    payment.paymentMethod as PaymentMethod,
    payment.currency,
  );

  /*
   * External provider verification MUST happen before opening the
   * database transaction.
   */
  const verification = await paymentProvider.verifyPayment(payment.providerPaymentId, {
    paymentMethod: payment.paymentMethod as PaymentMethod,
    transactionId,
  });

  if (verification.status === 'unknown') {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_FAILED',
      resource: 'payment',
      resourceId: id,
      metadata: {
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        reason: verification.error ?? 'UNKNOWN_PROVIDER_STATUS',
      },
    });

    throw createError(502, verification.error ?? 'Unable to verify payment with provider');
  }

  if (verification.status !== 'success') {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_REJECTED',
      resource: 'payment',
      resourceId: id,
      metadata: {
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        providerStatus: verification.status,
      },
    });

    throw createError(409, `Payment provider status is ${verification.status}`);
  }

  if (
    verification.providerPaymentId &&
    verification.providerPaymentId !== payment.providerPaymentId
  ) {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
      resource: 'payment',
      resourceId: id,
      metadata: {
        reason: 'PROVIDER_PAYMENT_ID_MISMATCH',
        expectedProviderPaymentId: payment.providerPaymentId,
        providerPaymentId: verification.providerPaymentId,
      },
    });

    throw createError(409, 'Provider payment ID mismatch');
  }

  if (verification.referenceId && verification.referenceId !== payment.id) {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
      resource: 'payment',
      resourceId: id,
      metadata: {
        reason: 'REFERENCE_ID_MISMATCH',
        expectedReferenceId: payment.id,
        providerReferenceId: verification.referenceId,
      },
    });

    throw createError(409, 'Payment reference ID mismatch');
  }

  if (verification.amount !== undefined && verification.amount !== payment.amount) {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
      resource: 'payment',
      resourceId: id,
      metadata: {
        reason: 'AMOUNT_MISMATCH',
        expectedAmount: payment.amount,
        providerAmount: verification.amount,
      },
    });

    throw createError(409, 'Payment amount mismatch');
  }

  if (
    verification.currency &&
    verification.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
      resource: 'payment',
      resourceId: id,
      metadata: {
        reason: 'CURRENCY_MISMATCH',
        expectedCurrency: payment.currency,
        providerCurrency: verification.currency,
      },
    });

    throw createError(409, 'Payment currency mismatch');
  }

  const verifiedTransactionId = verification.transactionId ?? transactionId;

  if (transactionId && verification.transactionId && transactionId !== verification.transactionId) {
    await auditLog({
      userId,
      action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
      resource: 'payment',
      resourceId: id,
      metadata: {
        reason: 'TRANSACTION_ID_MISMATCH',
        callerTransactionId: transactionId,
        providerTransactionId: verification.transactionId,
      },
    });

    throw createError(409, 'Payment transaction ID mismatch');
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
          subscriptionId: true,
          providerPaymentId: true,
          transactionId: true,
        },
      });

      if (!currentPayment) {
        throw createError(404, 'Payment not found');
      }

      if (currentPayment.status !== 'pending') {
        throw createError(409, 'Payment is not pending');
      }

      if (
        currentPayment.providerPaymentId &&
        currentPayment.providerPaymentId !== payment.providerPaymentId
      ) {
        throw createError(409, 'Provider payment ID mismatch');
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id,
        },
        data: {
          status: 'success',
          transactionId: verifiedTransactionId,
        },
      });

      await activateEntitlementInTransaction(currentPayment.subscriptionId, tx);

      return updatedPayment;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );

  await auditLog({
    userId,
    action: 'PAYMENT_SUCCESS',
    resource: 'payment',
    resourceId: id,
    metadata: {
      transactionId: verifiedTransactionId,
      providerPaymentId: payment.providerPaymentId,
      verified: true,
      providerStatus: verification.status,
    },
  });

  return updated;
}

export async function enableAutoDebit(data: {
  userId: string;
  subscriptionId: string;
  customerId: string;
  paymentMethodId: string;
}) {
  const paymentMethodId = data.paymentMethodId.trim();

  if (!paymentMethodId) {
    throw createError(400, 'Payment method is required');
  }

  const customerId = data.customerId.trim();

  if (!customerId) {
    throw createError(400, 'Payment customer is required');
  }

  const result = await updateSubscriptionAutoDebit(data.subscriptionId, data.userId, {
    enabled: true,
    customerId,
    paymentMethodId,
  });

  await auditLog({
    userId: data.userId,
    action: 'PAYMENT_AUTODEBIT_ENABLED',
    resource: 'subscription',
    resourceId: data.subscriptionId,
    metadata: {
      autoDebit: true,
    },
  });

  return result;
}

export async function disableAutoDebit(subscriptionId: string, userId: string) {
  try {
    const result = await updateSubscriptionAutoDebit(subscriptionId, userId, {
      enabled: false,
    });

    await auditLog({
      userId,
      action: 'PAYMENT_AUTODEBIT_DISABLED',
      resource: 'subscription',
      resourceId: subscriptionId,
      metadata: {
        autoDebit: false,
      },
    });

    return result;
  } catch (error: any) {
    if (error.message === 'Subscription not found') {
      throw createError(404, 'Subscription not found');
    }

    throw error;
  }
}
