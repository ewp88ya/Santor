import type { FastifyRequest } from 'fastify';

import { processPaymentWebhook } from './payment.webhook.js';

import {
  createNewPayment,
  disableAutoDebit,
  enableAutoDebit,
  getPayment,
  getPayments,
  markPaymentSuccess,
} from './payment.service.js';

function getUserId(request: FastifyRequest) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw new Error('Authenticated user ID is missing');
  }

  return user.id;
}

export async function createPaymentController(request: FastifyRequest) {
  const body = request.body as {
    subscriptionId: string;
    provider: string;
    amount: number;
    currency: string;
    autoDebit?: boolean;
  };

  return createNewPayment({
    ...body,
    userId: getUserId(request),
  });
}

export async function listPaymentController(request: FastifyRequest) {
  return getPayments(getUserId(request));
}

export async function detailPaymentController(request: FastifyRequest) {
  const { id } = request.params as {
    id: string;
  };

  return getPayment(id, getUserId(request));
}

export async function paymentSuccessController(request: FastifyRequest) {
  const { id } = request.params as {
    id: string;
  };

  const body = request.body as {
    transactionId: string;
  };

  return markPaymentSuccess(id, body.transactionId, getUserId(request));
}

export async function enableAutoDebitController(request: FastifyRequest) {
  const body = request.body as {
    subscriptionId: string;
    customerId: string;
    paymentMethodId: string;
  };

  return enableAutoDebit({
    ...body,
    userId: getUserId(request),
  });
}

export async function disableAutoDebitController(request: FastifyRequest) {
  const body = request.body as {
    subscriptionId: string;
  };

  return disableAutoDebit(body.subscriptionId, getUserId(request));
}

export async function paymentWebhookController(request: FastifyRequest) {
  const body = request.body as {
    eventId: string;
    type: 'payment.success' | 'payment.failed';
    paymentId: string;
    transactionId?: string;
  };

  return processPaymentWebhook(body);
}
