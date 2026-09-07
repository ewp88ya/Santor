import createError from 'http-errors';
import type { FastifyRequest } from 'fastify';

import { processAlipayWebhook, processWeChatPayWebhook } from './china-webhook.service.js';
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
import { refundPayment } from './payment.refund.service.js';

import type { PaymentMethod } from './providers/payment.provider.js';

function getUserId(request: FastifyRequest) {
  const user = request.user as { id?: string };
  if (!user?.id) throw new Error('Authenticated user ID is missing');
  return user.id;
}

function getInternalWebhookSecret(request: FastifyRequest) {
  const configuredSecret = process.env.SANTOR_INTERNAL_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) throw createError(500, 'Internal webhook secret is not configured');
  const header = request.headers['x-santor-webhook-secret'];
  const providedSecret = Array.isArray(header) ? header[0] : header;
  if (!providedSecret || providedSecret !== configuredSecret)
    throw createError(401, 'Invalid internal webhook secret');
  return providedSecret;
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
  const { id } = request.params as { id: string };
  return getPayment(id, getUserId(request));
}

export async function paymentSuccessController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const body = request.body as { transactionId: string };
  return markPaymentSuccess(id, body.transactionId, getUserId(request));
}

export async function refundPaymentController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const body = request.body as { reason?: string; refundId?: string };
  return refundPayment({
    paymentId: id,
    userId: getUserId(request),
    reason: body.reason,
    refundId: body.refundId,
  });
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
  const body = request.body as { subscriptionId: string };
  return disableAutoDebit(body.subscriptionId, getUserId(request));
}

export async function paymentWebhookController(request: FastifyRequest) {
  getInternalWebhookSecret(request);
  return processPaymentWebhook(request.body as Parameters<typeof processPaymentWebhook>[0]);
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
  const merchantIdHeader = request.headers['x-merchantid'];
  const secretHeader = request.headers['x-secret'];

  const merchantId = Array.isArray(merchantIdHeader) ? merchantIdHeader[0] : merchantIdHeader;
  const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  const configuredMerchantId = process.env.PLATEGA_MERCHANT_ID?.trim();
  const configuredSecret = process.env.PLATEGA_SECRET?.trim();

  if (!configuredMerchantId || !configuredSecret) {
    throw createError(503, 'Platega webhook credentials are not configured');
  }

  if (merchantId !== configuredMerchantId || secret !== configuredSecret) {
    throw createError(401, 'Invalid Platega webhook credentials');
  }

  return processPlategaWebhook(request.body as Parameters<typeof processPlategaWebhook>[0]);
}

export async function alipayWebhookController(request: FastifyRequest) {
  return processAlipayWebhook(request.body as Parameters<typeof processAlipayWebhook>[0]);
}

export async function wechatPayWebhookController(request: FastifyRequest) {
  return processWeChatPayWebhook(request.body as Parameters<typeof processWeChatPayWebhook>[0]);
}
