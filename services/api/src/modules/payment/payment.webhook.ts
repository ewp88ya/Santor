import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { activateEntitlementInTransaction } from '../entitlement/entitlement.service.js';

import { paymentConfig } from './providers/payment.config.js';
import { PlategaAdapter } from './providers/platega.adapter.js';
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

type PlategaWebhookBody = {
  id?: string;
  transactionId?: string;
  transaction_id?: string;

  merchantTransactionId?: string;
  merchant_transaction_id?: string;

  referenceId?: string;
  reference_id?: string;

  status?: string;
  event?: string;
  type?: string;

  amount?: number;
  currency?: string;

  data?: {
    id?: string;
    transactionId?: string;
    transaction_id?: string;
    merchantTransactionId?: string;
    merchant_transaction_id?: string;
    referenceId?: string;
    reference_id?: string;
    status?: string;
    event?: string;
    type?: string;
    amount?: number;
    currency?: string;
  };
};

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized || undefined;
}

function normalizeCurrency(value: string | undefined): string | undefined {
  const normalized = clean(value)?.toUpperCase();

  return normalized || undefined;
}

/*
 * --------------------------------------------------------------------------
 * XENDIT
 * --------------------------------------------------------------------------
 */

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

/*
 * --------------------------------------------------------------------------
 * PLATEGA
 * --------------------------------------------------------------------------
 */

function getPlategaData(body: PlategaWebhookBody) {
  return body.data ?? body;
}

function getPlategaTransactionId(body: PlategaWebhookBody): string | undefined {
  const data = getPlategaData(body);

  return clean(data.transactionId) ?? clean(data.transaction_id) ?? clean(data.id);
}

function getPlategaReferenceId(body: PlategaWebhookBody): string | undefined {
  const data = getPlategaData(body);

  return (
    clean(data.merchantTransactionId) ??
    clean(data.merchant_transaction_id) ??
    clean(data.referenceId) ??
    clean(data.reference_id)
  );
}

function getPlategaStatus(body: PlategaWebhookBody): string | undefined {
  const data = getPlategaData(body);

  return clean(data.status) ?? clean(data.event) ?? clean(data.type);
}

function getPlategaEventId(body: PlategaWebhookBody): string | undefined {
  const transactionId = getPlategaTransactionId(body);
  const referenceId = getPlategaReferenceId(body);
  const status = getPlategaStatus(body);

  const identifier = transactionId ?? referenceId;

  if (!identifier) {
    return undefined;
  }

  return ['platega', identifier, status?.trim().toLowerCase() ?? 'webhook']
    .filter(Boolean)
    .join(':');
}

function normalizePlategaWebhook(body: PlategaWebhookBody): PaymentWebhookEvent | null {
  const transactionId = getPlategaTransactionId(body);
  const referenceId = getPlategaReferenceId(body);
  const status = getPlategaStatus(body)?.trim().toLowerCase();

  const paymentId = referenceId;

  if (!paymentId) {
    return null;
  }

  const eventId = getPlategaEventId(body) ?? `platega:webhook:${paymentId}`;

  if (status?.includes('failed') || status?.includes('cancel') || status?.includes('expired')) {
    return {
      eventId,
      type: 'payment.failed',
      paymentId,
      transactionId,
    };
  }

  if (
    status?.includes('success') ||
    status?.includes('confirmed') ||
    status?.includes('complete') ||
    status?.includes('paid')
  ) {
    return {
      eventId,
      type: 'payment.success',
      paymentId,
      transactionId,
    };
  }

  /*
   * Pending / waiting / unknown webhook states must never be
   * normalized into payment.success.
   *
   * Platega webhook payloads are untrusted input. Only explicit
   * terminal states are allowed to enter the common payment
   * transition pipeline. Provider verification remains the
   * authoritative source of payment state.
   */
  return null;
}

/*
 * --------------------------------------------------------------------------
 * PROVIDER RECONCILIATION
 * --------------------------------------------------------------------------
 */

async function reconcileXenditPayment(paymentId: string) {
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

async function reconcilePlategaPayment(paymentId: string) {
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

  if (payment.provider !== 'RussiaPaymentAdapter') {
    return {
      payment,
      reconciled: false,
      status: 'failed' as const,
      transactionId: payment.transactionId ?? undefined,
    } as const;
  }

  if (!payment.providerPaymentId) {
    throw createError(409, 'Payment does not have a Platega transaction ID');
  }

  const adapter = new PlategaAdapter();

  const verification = await adapter.verifyPayment(payment.providerPaymentId);

  if (verification.status === 'unknown') {
    throw createError(502, verification.error ?? 'Unable to verify payment with Platega');
  }

  const expectedReferenceId = payment.id.trim();
  const providerReferenceId = clean(verification.referenceId);

  if (!providerReferenceId) {
    throw createError(502, 'Platega verification response does not contain reference ID');
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

    throw createError(409, 'Platega payment reference ID does not match payment');
  }

  if (verification.amount === undefined || !Number.isFinite(verification.amount)) {
    throw createError(502, 'Platega verification response does not contain a valid amount');
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

    throw createError(409, 'Platega payment amount does not match payment');
  }

  const expectedCurrency = normalizeCurrency(payment.currency);
  const providerCurrency = normalizeCurrency(verification.currency);

  if (!expectedCurrency || !providerCurrency) {
    throw createError(502, 'Platega verification response does not contain a valid currency');
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

    throw createError(409, 'Platega payment currency does not match payment');
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

/*
 * --------------------------------------------------------------------------
 * COMMON PAYMENT WEBHOOK PROCESSOR
 * --------------------------------------------------------------------------
 */

function resolveWebhookStatus(
  reconciledStatus:
    'pending' | 'requires_action' | 'success' | 'failed' | 'expired' | 'canceled' | 'unknown',
): 'success' | 'failed' | null {
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

async function reconcilePayment(event: PaymentWebhookEvent) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: event.paymentId,
    },
    include: {
      subscription: true,
    },
  });

  if (!payment) {
    throw createError(404, 'Payment not found');
  }

  switch (payment.provider) {
    case 'XenditAdapter':
      return reconcileXenditPayment(event.paymentId);

    case 'RussiaPaymentAdapter':
      return reconcilePlategaPayment(event.paymentId);

    default:
      return {
        payment,
        reconciled: false,
        status: event.type === 'payment.success' ? 'success' : 'failed',
        transactionId: payment.transactionId ?? event.transactionId ?? undefined,
      } as const;
  }
}

export async function processPaymentWebhook(event: PaymentWebhookEvent) {
  if (!event.eventId) {
    throw createError(400, 'Webhook event ID is required');
  }

  if (!event.paymentId) {
    throw createError(400, 'Payment ID is required');
  }

  /*
   * ------------------------------------------------------------------------
   * IDEMPOTENCY CHECK
   * ------------------------------------------------------------------------
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
   * ------------------------------------------------------------------------
   * PROVIDER RECONCILIATION
   * ------------------------------------------------------------------------
   */

  const reconciliation = await reconcilePayment(event);

  if (!reconciliation.reconciled) {
    throw createError(409, 'Payment provider verification was not completed');
  }

  /*
   * ------------------------------------------------------------------------
   * WEBHOOK TYPE MUST MATCH VERIFIED PROVIDER STATUS
   * ------------------------------------------------------------------------
   *
   * The webhook is only a trigger.
   *
   * A malicious or stale webhook must never be allowed to invert the
   * provider's authoritative state:
   *
   *   payment.success + provider.failed  -> reject
   *   payment.failed  + provider.success -> reject
   *
   * Terminal provider states are mapped to the only valid webhook type.
   * Pending / requires_action / unknown remain non-terminal.
   */

  const expectedWebhookType =
    reconciliation.status === 'success'
      ? 'payment.success'
      : reconciliation.status === 'failed' || reconciliation.status === 'expired'
        ? 'payment.failed'
        : null;

  if (expectedWebhookType && event.type !== expectedWebhookType) {
    await auditLog({
      userId: reconciliation.payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_TYPE_MISMATCH',
      resource: 'payment',
      resourceId: reconciliation.payment.id,
      metadata: {
        eventId: event.eventId,
        webhookType: event.type,
        expectedWebhookType,
        provider: reconciliation.payment.provider,
        providerStatus: reconciliation.status,
        transactionId: reconciliation.transactionId ?? event.transactionId,
      },
    });

    throw createError(
      409,
      `Payment webhook type does not match provider status: expected ${expectedWebhookType}`,
    );
  }

  /*
   * ------------------------------------------------------------------------
   * RESOLVE FINAL PAYMENT STATUS
   * ------------------------------------------------------------------------
   */

  const finalStatus = resolveWebhookStatus(reconciliation.status);

  if (!finalStatus) {
    await auditLog({
      userId: reconciliation.payment.subscription.userId,
      action: 'PAYMENT_WEBHOOK_RECONCILIATION_PENDING',
      resource: 'payment',
      resourceId: reconciliation.payment.id,
      metadata: {
        eventId: event.eventId,
        webhookType: event.type,
        provider: reconciliation.payment.provider,
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
   * ------------------------------------------------------------------------
   * ATOMIC PAYMENT + ENTITLEMENT TRANSACTION
   * ------------------------------------------------------------------------
   *
   * SUCCESS:
   *
   * payment
   *   ↓
   * subscription
   *   ↓
   * license
   *   ↓
   * VPN access
   *
   * All operations use the SAME Prisma transaction.
   *
   * If entitlement activation fails, the payment transition is rolled back.
   *
   * FAILED:
   *
   * Only the payment state is transitioned.
   */

  const result = await prisma.$transaction(
    async (tx) => {
      const transition = await transitionPaymentFromWebhook(
        {
          paymentId: reconciliation.payment.id,
          status: finalStatus,
          transactionId: reconciliation.transactionId ?? event.transactionId,
          webhookEventId: event.eventId,
        },
        tx,
      );

      if (!transition.transitioned) {
        return transition;
      }

      if (finalStatus === 'failed') {
        return transition;
      }

      await activateEntitlementInTransaction(transition.payment.subscriptionId, tx);

      return transition;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );

  /*
   * ------------------------------------------------------------------------
   * SECONDARY IDEMPOTENCY PROTECTION
   * ------------------------------------------------------------------------
   */

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

  /*
   * Payment already has the desired state or
   * transition was not performed.
   */

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

  /*
   * ------------------------------------------------------------------------
   * FAILED PAYMENT
   * ------------------------------------------------------------------------
   */

  if (finalStatus === 'failed') {
    await auditLog({
      userId: result.payment.subscription.userId,
      action: 'payment.webhook.failed',
      resource: 'payment',
      resourceId: result.payment.id,
      metadata: {
        eventId: event.eventId,
        webhookType: event.type,
        provider: result.payment.provider,
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
   * ------------------------------------------------------------------------
   * SUCCESS PAYMENT
   * ------------------------------------------------------------------------
   *
   * At this point the transaction has already committed:
   *
   * 1. Provider verification succeeded.
   * 2. Reference ID matched.
   * 3. Amount matched.
   * 4. Currency matched.
   * 5. Provider status was success.
   * 6. Payment transitioned to success.
   * 7. Subscription activated.
   * 8. License activated.
   * 9. VPN access activated/provisioned when required.
   */

  await auditLog({
    userId: result.payment.subscription.userId,
    action: 'payment.webhook.success',
    resource: 'payment',
    resourceId: result.payment.id,
    metadata: {
      eventId: event.eventId,
      webhookType: event.type,
      provider: result.payment.provider,
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

/*
 * --------------------------------------------------------------------------
 * XENDIT WEBHOOK ENTRYPOINT
 * --------------------------------------------------------------------------
 */

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

/*
 * --------------------------------------------------------------------------
 * PLATEGA WEBHOOK ENTRYPOINT
 * --------------------------------------------------------------------------
 */

export async function processPlategaWebhook(body: PlategaWebhookBody) {
  const event = normalizePlategaWebhook(body);

  if (!event) {
    return {
      processed: false,
      ignored: true,
      reason: 'UNSUPPORTED_WEBHOOK_EVENT',
    };
  }

  return processPaymentWebhook(event);
}
