import type { FastifyRequest } from 'fastify';

import {
  processPaymentWebhook,
  processPlategaWebhook,
  processXenditWebhook,
} from './payment.webhook.js';

import {
  createNewPayment,
  disableAutoDebit,
  enableAutoDebit,
  getPayment,
  getPayments,
  markPaymentSuccess,
} from './payment.service.js';

import type { PaymentMethod } from './providers/payment.provider.js';

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
    country: string;
    currency: string;
    paymentMethod: PaymentMethod;
    settlementCurrency?: string;
    autoDebit?: boolean;
  };

  return createNewPayment({
    subscriptionId: body.subscriptionId,
    country: body.country,
    currency: body.currency,
    paymentMethod: body.paymentMethod,
    settlementCurrency: body.settlementCurrency,
    autoDebit: body.autoDebit,
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
    subscriptionId: body.subscriptionId,
    customerId: body.customerId,
    paymentMethodId: body.paymentMethodId,
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

export async function xenditWebhookController(request: FastifyRequest) {
  const token = request.headers['x-callback-token'];

  const normalizedToken = Array.isArray(token) ? token[0] : token;

  return processXenditWebhook(
    request.body as Parameters<typeof processXenditWebhook>[0],
    normalizedToken,
  );
}

export async function plategaWebhookController(request: FastifyRequest) {
  return processPlategaWebhook(
    request.body as Parameters<typeof processPlategaWebhook>[0],
  );
}
