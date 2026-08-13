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

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized || undefined;
}

function normalizeCurrency(value: string | undefined): string | undefined {
  const normalized = clean(value)?.toUpperCase();

  return normalized || undefined;
}

function extractWebhookPayload(body: XenditWebhookBody) {
  const capture = body.paymentCapture?.value;
  const failure = body.paymentFailure?.value;
  const expiry = body.paymentExpiry?.value ?? body.paymentRequestExpiry?.value;

  const value = capture ?? failure ?? expiry;

  const event = clean(value?.event) ?? clean(body.event);
  const created = clean(value?.created);

  const data = value?.data ?? body.data ?? {};

  return {
    event,
    created,
    data,
  };
}

function getWebhookEventId(body: XenditWebhookBody, data: XenditWebhookData): string | undefined {
  const providerPaymentId = clean(data.payment_id);
  const paymentRequestId = clean(data.payment_request_id);

  const { event, created } = extractWebhookPayload(body);

  const providerId = providerPaymentId ?? paymentRequestId;

  if (!providerId) {
    return undefined;
  }

  return [event ?? 'payment.webhook', providerId, created ?? ''].filter(Boolean).join(':');
}

function verifyXenditWebhook(token: string | undefined) {
  const configuredToken = clean(paymentConfig.xendit.webhookToken);

  if (!configuredToken) {
    throw createError(503, 'Xendit webhook token is not configured');
  }

  if (!token || token !== configuredToken) {
    throw createError(401, 'Invalid Xendit webhook token');
  }
}

function normalizeWebhookEvent(body: XenditWebhookBody): PaymentWebhookEvent | null {
  const { event, data } = extractWebhookPayload(body);

  const referenceId = clean(data.reference_id);
  const paymentId = referenceId ?? clean(data.payment_id) ?? clean(data.payment_request_id);

  if (!paymentId) {
    return null;
  }

  const normalizedEvent = event?.trim().toLowerCase() ?? '';

  const eventId = getWebhookEventId(body, data) ?? `payment.webhook:${paymentId}`;

  const transactionId = clean(data.transaction_id) ?? clean(data.payment_id);

  if (normalizedEvent.includes('failed') || normalizedEvent.includes('failure')) {
    return {
      eventId,
      type: 'payment.failed',
      paymentId,
      transactionId,
    };
  }

  if (normalizedEvent.includes('expired') || normalizedEvent.includes('expiry')) {
    return {
      eventId,
      type: 'payment.failed',
      paymentId,
      transactionId,
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
      transactionId,
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
      transactionId: payment.transactionId ?? undefined,
    } as const;
  }

  if (!payment.providerPaymentId) {
    throw createError(409, 'Payment does not have a provider payment request ID');
  }

  const adapter = new XenditAdapter();

  const verification = await adapter.verifyPayment(payment.providerPaymentId);

  if (verification.status === 'unknown') {
    throw createError(502, verification.error ?? 'Unable to verify payment with Xendit');
  }

  const expectedReferenceId = payment.id.trim();
  const providerReferenceId = clean(verification.referenceId);

  if (!providerReferenceId) {
    throw createError(502, 'Xendit verification response does not contain reference ID');
  }

  if (providerReferenceId !== expectedReferenceId) {
    await auditLog({
      userId: payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        reason: 'REFERENCE_ID_MISMATCH',
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        expectedReferenceId,
        providerReferenceId,
      },
    });

    throw createError(409, 'Xendit payment reference ID does not match payment');
  }

  if (verification.amount === undefined || !Number.isFinite(verification.amount)) {
    throw createError(502, 'Xendit verification response does not contain a valid amount');
  }

  if (verification.amount !== payment.amount) {
    await auditLog({
      userId: payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        reason: 'AMOUNT_MISMATCH',
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        expectedAmount: payment.amount,
        providerAmount: verification.amount,
      },
    });

    throw createError(409, 'Xendit payment amount does not match payment');
  }

  const expectedCurrency = normalizeCurrency(payment.currency);
  const providerCurrency = normalizeCurrency(verification.currency);

  if (!expectedCurrency || !providerCurrency) {
    throw createError(502, 'Xendit verification response does not contain a valid currency');
  }

  if (providerCurrency !== expectedCurrency) {
    await auditLog({
      userId: payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        reason: 'CURRENCY_MISMATCH',
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        expectedCurrency,
        providerCurrency,
      },
    });

    throw createError(409, 'Xendit payment currency does not match payment');
  }

  return {
    payment,
    reconciled: true,
    status: verification.status,
    transactionId: verification.transactionId ?? payment.transactionId ?? undefined,
    referenceId: providerReferenceId,
    amount: verification.amount,
    currency: providerCurrency,
  } as const;
}

function resolveWebhookStatus(
  reconciledStatus:
    | 'pending'
    | 'requires_action'
    | 'success'
    | 'failed'
    | 'expired'
    | 'canceled'
    | 'unknown',
): 'success' | 'failed' | null {
  /*
   * The provider's reconciled status is authoritative.
   *
   * A webhook only triggers reconciliation.
   * We never trust the webhook event type by itself.
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

  return null;
}

export async function processPaymentWebhook(event: PaymentWebhookEvent) {
  if (!event.eventId) {
    throw createError(400, 'Webhook event ID is required');
  }

  if (!event.paymentId) {
    throw createError(400, 'Payment ID is required');
  }

  /*
   * Idempotency:
   * Xendit may retry the same webhook.
   */
  const existing = await prisma.payment.findUnique({
    where: {
      webhookEventId: event.eventId,
    },
    include: {
      subscription: true,
    },
  });

  if (existing) {
    return {
      processed: true,
      duplicate: true,
      reconciled: false,
      transitioned: false,
      paymentId: existing.id,
      status: existing.status,
    };
  }

  /*
   * Reconcile directly against Xendit.
   *
   * The webhook itself is never considered authoritative.
   *
   * Reconciliation also validates:
   * - reference ID
   * - amount
   * - currency
   */
  const reconciliation = await reconcileXenditPayment(event.paymentId, event.type);

  const finalStatus = resolveWebhookStatus(reconciliation.status);

  /*
   * Provider has not reached a terminal state.
   *
   * Do not mark payment success/failed.
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
        transactionId: reconciliation.transactionId ?? event.transactionId,
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

  /*
   * Atomic payment state transition.
   *
   * Repository layer is responsible for:
   * - valid state transition
   * - webhook idempotency
   * - preventing duplicate terminal transitions
   * - persisting webhookEventId
   */
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

  /*
   * Successful payment:
   *
   * 1. Payment state -> success
   * 2. License generation
   * 3. Audit log
   *
   * VPN access/subscription activation remains
   * downstream lifecycle responsibility.
   */
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

export async function processXenditWebhook(
  body: XenditWebhookBody,
  token: string | undefined,
) {
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
