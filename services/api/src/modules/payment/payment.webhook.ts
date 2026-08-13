import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { generateLicense } from '../license/license.service.js';
import { paymentConfig } from './providers/payment.config.js';
import { XenditAdapter } from './providers/xendit.adapter.js';

import { transitionPaymentFromWebhook } from './payment.repository.js';

type XenditWebhookValue = {
  event?: string;
  created?: string;
  data?: XenditWebhookData;
};

type XenditWebhookData = {
  payment_id?: string;
  payment_request_id?: string;
  reference_id?: string;
  status?: string;
  transaction_id?: string;
  request_amount?: number;
  currency?: string;
};

type XenditWebhookBody = {
  event?: string;

  paymentCapture?: {
    value?: XenditWebhookValue;
  };

  paymentFailure?: {
    value?: XenditWebhookValue;
  };

  paymentExpiry?: {
    value?: XenditWebhookValue;
  };

  paymentRequestExpiry?: {
    value?: XenditWebhookValue;
  };

  data?: XenditWebhookData;
};

export type PaymentWebhookEvent = {
  eventId: string;
  type: 'payment.success' | 'payment.failed';
  paymentId: string;
  transactionId?: string;
};

function extractWebhookPayload(body: XenditWebhookBody) {
  const capture = body.paymentCapture?.value;
  const failure = body.paymentFailure?.value;
  const expiry = body.paymentExpiry?.value ?? body.paymentRequestExpiry?.value;

  const value = capture ?? failure ?? expiry;

  const event = value?.event ?? body.event;

  const created = value?.created;

  const data = value?.data ?? body.data ?? {};

  return {
    event,
    created,
    data,
  };
}

function getWebhookEventId(body: XenditWebhookBody, data: XenditWebhookData): string | undefined {
  const paymentId = data.payment_id?.trim();
  const paymentRequestId = data.payment_request_id?.trim();

  const { event, created } = extractWebhookPayload(body);

  const providerId = paymentId ?? paymentRequestId;

  if (!providerId) {
    return undefined;
  }

  return [event ?? 'payment.webhook', providerId, created ?? ''].filter(Boolean).join(':');
}

function verifyXenditWebhook(token: string | undefined) {
  const configuredToken = paymentConfig.xendit.webhookToken;

  if (!configuredToken) {
    throw createError(503, 'Xendit webhook token is not configured');
  }

  if (!token || token !== configuredToken) {
    throw createError(401, 'Invalid Xendit webhook token');
  }
}

function normalizeWebhookEvent(body: XenditWebhookBody): PaymentWebhookEvent | null {
  const { event, data } = extractWebhookPayload(body);

  const paymentId =
    data.reference_id?.trim() ?? data.payment_id?.trim() ?? data.payment_request_id?.trim();

  if (!paymentId) {
    return null;
  }

  const normalizedEvent = event?.trim().toLowerCase() ?? '';

  const eventId = getWebhookEventId(body, data) ?? `payment.webhook:${paymentId}`;

  if (normalizedEvent.includes('failed') || normalizedEvent.includes('failure')) {
    return {
      eventId,
      type: 'payment.failed',
      paymentId,
      transactionId: data.payment_id ?? data.transaction_id,
    };
  }

  if (normalizedEvent.includes('expired') || normalizedEvent.includes('expiry')) {
    return {
      eventId,
      type: 'payment.failed',
      paymentId,
      transactionId: data.payment_id ?? data.transaction_id,
    };
  }

  if (
    normalizedEvent.includes('capture') ||
    normalizedEvent.includes('success') ||
    normalizedEvent.includes('succeeded')
  ) {
    return {
      eventId,
      type: 'payment.success',
      paymentId,
      transactionId: data.payment_id ?? data.transaction_id,
    };
  }

  return null;
}

async function reconcileXenditPayment(
  paymentId: string,
  expectedWebhookType: PaymentWebhookEvent['type'],
) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      subscription: true,
    },
  });

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  if (payment.provider !== 'XenditAdapter') {
    return {
      payment,
      reconciled: false,
      status: expectedWebhookType === 'payment.success' ? 'success' : 'failed',
    } as const;
  }

  if (!payment.providerPaymentId) {
    throw createError(409, 'Payment does not have a provider payment request ID');
  }

  const adapter = new XenditAdapter();

  const reconciliation = await adapter.reconcilePayment(payment.providerPaymentId);

  if (!reconciliation.success) {
    throw createError(502, reconciliation.error ?? 'Unable to reconcile payment with Xendit');
  }

  if (reconciliation.referenceId && reconciliation.referenceId !== payment.id) {
    throw createError(409, 'Xendit payment reference does not match Santor payment');
  }

  if (reconciliation.amount !== undefined && reconciliation.amount !== payment.amount) {
    throw createError(409, 'Xendit payment amount does not match Santor payment');
  }

  if (
    reconciliation.currency &&
    reconciliation.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    throw createError(409, 'Xendit payment currency does not match Santor payment');
  }

  return {
    payment,
    reconciled: true,
    status: reconciliation.status,
    transactionId: reconciliation.transactionId ?? payment.transactionId ?? undefined,
  } as const;
}

function resolveWebhookStatus(
  expectedWebhookType: PaymentWebhookEvent['type'],
  reconciledStatus:
    'pending' | 'requires_action' | 'success' | 'failed' | 'expired' | 'canceled' | 'unknown',
): 'success' | 'failed' | null {
  /*
   * The webhook is only a trigger.
   * The provider's reconciled status is authoritative.
   */

  if (reconciledStatus === 'success') {
    return 'success';
  }

  if (
    reconciledStatus === 'failed' ||
    reconciledStatus === 'expired' ||
    reconciledStatus === 'canceled'
  ) {
    return 'failed';
  }

  /*
   * Never mark a payment successful merely because
   * a success-looking webhook arrived.
   */
  if (expectedWebhookType === 'payment.success') {
    return null;
  }

  return null;
}

export async function processPaymentWebhook(event: PaymentWebhookEvent) {
  if (!event.eventId) {
    throw createError(400, 'Webhook event ID is required');
  }

  if (!event.paymentId) {
    throw createError(400, 'Payment ID is required');
  }

  const existing = await prisma.payment.findUnique({
    where: {
      webhookEventId: event.eventId,
    },
  });

  if (existing) {
    return {
      processed: true,
      duplicate: true,
      paymentId: existing.id,
      status: existing.status,
    };
  }

  const reconciliation = await reconcileXenditPayment(event.paymentId, event.type);

  const finalStatus = resolveWebhookStatus(event.type, reconciliation.status);

  /*
   * Provider says the payment is not terminal yet.
   *
   * We acknowledge the webhook without mutating the payment
   * into success/failed.
   */
  if (!finalStatus) {
    await auditLog({
      userId: reconciliation.payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_RECONCILIATION_PENDING',
      resource: 'payment',
      resourceId: reconciliation.payment.id,
      metadata: {
        eventId: event.eventId,
        webhookType: event.type,
        providerStatus: reconciliation.status,
        transactionId: reconciliation.transactionId,
      },
    });

    return {
      processed: true,
      duplicate: false,
      reconciled: reconciliation.reconciled,
      transitioned: false,
      paymentId: reconciliation.payment.id,
      status: reconciliation.status,
    };
  }

  const result = await transitionPaymentFromWebhook({
    paymentId: reconciliation.payment.id,
    status: finalStatus,
    transactionId: reconciliation.transactionId ?? event.transactionId,
    webhookEventId: event.eventId,
  });

  if (result.duplicate) {
    return {
      processed: true,
      duplicate: true,
      reconciled: reconciliation.reconciled,
      transitioned: false,
      paymentId: result.payment.id,
      status: result.payment.status,
    };
  }

  if (!result.transitioned) {
    return {
      processed: true,
      duplicate: false,
      reconciled: reconciliation.reconciled,
      transitioned: false,
      paymentId: result.payment.id,
      status: result.payment.status,
    };
  }

  if (finalStatus === 'failed') {
    await auditLog({
      userId: result.payment.subscription.userId,
      action: 'payment.webhook.failed',
      resource: 'payment',
      resourceId: result.payment.id,
      metadata: {
        eventId: event.eventId,
        webhookType: event.type,
        providerStatus: reconciliation.status,
        transactionId: reconciliation.transactionId ?? event.transactionId,
      },
    });

    return {
      processed: true,
      duplicate: false,
      reconciled: reconciliation.reconciled,
      transitioned: true,
      paymentId: result.payment.id,
      status: 'failed',
    };
  }

  await generateLicense(result.payment.subscriptionId);

  await auditLog({
    userId: result.payment.subscription.userId,
    action: 'payment.webhook.success',
    resource: 'payment',
    resourceId: result.payment.id,
    metadata: {
      eventId: event.eventId,
      webhookType: event.type,
      providerStatus: reconciliation.status,
      transactionId: reconciliation.transactionId ?? event.transactionId,
    },
  });

  return {
    processed: true,
    duplicate: false,
    reconciled: reconciliation.reconciled,
    transitioned: true,
    paymentId: result.payment.id,
    status: 'success',
  };
}

export async function processXenditWebhook(body: XenditWebhookBody, token: string | undefined) {
  verifyXenditWebhook(token);

  const event = normalizeWebhookEvent(body);

  if (!event) {
    return {
      processed: false,
      ignored: true,
      reason: 'UNSUPPORTED_WEBHOOK_EVENT',
    };
  }

  return processPaymentWebhook(event);
}
