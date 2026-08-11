import createError from 'http-errors';

import {
  createPayment,
  findPaymentById,
  findPaymentByIdForUser,
  listPayments,
  updatePaymentStatus,
  updateSubscriptionAutoDebit,
} from './payment.repository.js';

import { generateLicense } from '../license/license.service.js';
import { auditLog } from '../audit/audit.service.js';

export async function createNewPayment(data: {
  userId: string;
  subscriptionId: string;
  provider: string;
  amount: number;
  currency: string;
  autoDebit?: boolean;
}) {
  try {
    const payment = await createPayment(data);

    if (!payment) {
      throw createError(404, 'Payment not found');
    }

    if (payment.subscription.userId !== data.userId) {
      throw createError(403, 'Forbidden');
    }

    await auditLog({
      userId: data.userId,
      action: 'PAYMENT_CREATED',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        provider: data.provider,
        amount: data.amount,
        currency: data.currency,
        autoDebit: data.autoDebit ?? false,
      },
    });

    return payment;
  } catch (error: any) {
    if (error.message === 'Subscription already active') {
      const err = createError(409, 'Subscription already active');
      err.code = 'SUBSCRIPTION_ACTIVE';
      throw err;
    }

    if (error.message === 'Subscription not found') {
      throw createError(404, 'Subscription not found');
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
