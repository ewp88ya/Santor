import {
  createPayment,
  findPaymentById,
  listPayments,
  updatePaymentStatus,
} from './payment.repository.js';

import createError from 'http-errors';

export async function createNewPayment(data: {
  subscriptionId: string;
  provider: string;
  amount: number;
  currency: string;
}) {
  try {
    return await createPayment(data);
  } catch (error: any) {
    if (error.message === 'Subscription already active') {
      const error = createError(409, 'Subscription already active');

      error.code = 'SUBSCRIPTION_ACTIVE';

      throw error;
    }

    if (error.message === 'Subscription not found') {
      throw createError(404, 'Subscription not found');
    }

    throw error;
  }
}

export async function getPayment(id: string) {
  const payment = await findPaymentById(id);

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  return payment;
}

export async function getPayments() {
  return listPayments();
}

export async function markPaymentSuccess(id: string, transactionId: string) {
  const payment = await findPaymentById(id);

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  return updatePaymentStatus(id, 'success', transactionId);
}
