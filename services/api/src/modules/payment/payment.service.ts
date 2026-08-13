import createError from 'http-errors';

import {
  createPayment,
  findPaymentByIdForUser,
  listPayments,
  updatePaymentProvider,
  updatePaymentStatus,
  updateSubscriptionAutoDebit,
} from './payment.repository.js';

import { generateLicense } from '../license/license.service.js';
import { auditLog } from '../audit/audit.service.js';

import { routePaymentProvider } from './payment.router.js';
import type { PaymentMethod } from './providers/payment.provider.js';

import { GlobalCardAdapter, XenditAdapter, RussiaPaymentAdapter } from './providers/index.js';

const globalCardAdapter = new GlobalCardAdapter();
const xenditAdapter = new XenditAdapter();
const russiaPaymentAdapter = new RussiaPaymentAdapter();

function getPaymentProvider(country: string, paymentMethod: PaymentMethod) {
  return routePaymentProvider(country, paymentMethod, {
    globalCard: globalCardAdapter,
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

    const paymentProvider = getPaymentProvider(normalizedCountry, data.paymentMethod);

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

export async function markPaymentSuccess(id: string, transactionId: string, userId: string) {
  const payment = await findPaymentByIdForUser(id, userId);

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  const updated = await updatePaymentStatus(id, 'success', transactionId);

  await generateLicense(payment.subscriptionId);

  await auditLog({
    userId,
    action: 'PAYMENT_SUCCESS',
    resource: 'payment',
    resourceId: id,
    metadata: {
      transactionId,
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
