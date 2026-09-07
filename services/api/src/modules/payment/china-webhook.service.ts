import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { activateEntitlementInTransaction } from '../entitlement/entitlement.service.js';

import { transitionPaymentFromWebhook } from './payment.repository.js';
import { AlipayAdapter, WeChatPayAdapter } from './providers/index.js';

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function assertReconciled(
  payment: {
    id: string;
    amount: number;
    currency: string;
  },
  verification: {
    status: string;
    referenceId?: string;
    amount?: number;
    currency?: string;
  },
) {
  if (verification.status !== 'success' && verification.status !== 'failed') {
    throw createError(409, `Provider status is ${verification.status}`);
  }

  if (verification.referenceId && verification.referenceId !== payment.id) {
    throw createError(409, 'Provider reference ID mismatch');
  }

  if (verification.amount !== undefined && verification.amount !== payment.amount) {
    throw createError(409, 'Provider amount mismatch');
  }

  if (verification.currency && verification.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    throw createError(409, 'Provider currency mismatch');
  }
}

async function transitionVerifiedPayment(input: {
  paymentId: string;
  eventId: string;
  status: 'success' | 'failed';
  transactionId?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { subscription: true },
  });

  if (!payment) throw createError(404, 'Payment not found');

  const result = await prisma.$transaction(
    async (tx) => {
      const transition = await transitionPaymentFromWebhook(
        {
          paymentId: payment.id,
          status: input.status,
          transactionId: input.transactionId,
          webhookEventId: input.eventId,
        },
        tx,
      );

      if (transition.transitioned && input.status === 'success') {
        await activateEntitlementInTransaction(transition.payment.subscriptionId, tx);
      }

      return transition;
    },
    { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
  );

  return {
    processed: true,
    duplicate: result.duplicate,
    reconciled: true,
    transitioned: result.transitioned,
    paymentId: result.payment.id,
    status: result.payment.status,
  };
}

type AlipayWebhookBody = {
  paymentId?: string;
  referenceOrderId?: string;
  paymentStatus?: string;
  transactionId?: string;
  eventId?: string;
  data?: {
    paymentId?: string;
    referenceOrderId?: string;
    paymentStatus?: string;
    transactionId?: string;
    eventId?: string;
  };
};

export async function processAlipayWebhook(body: AlipayWebhookBody) {
  const data = body.data ?? body;
  const paymentId = clean(data.referenceOrderId);
  const providerPaymentId = clean(data.paymentId);

  if (!paymentId) throw createError(400, 'Alipay referenceOrderId is required');
  if (!providerPaymentId) throw createError(400, 'Alipay paymentId is required');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, amount: true, currency: true },
  });

  if (!payment) throw createError(404, 'Payment not found');

  const verification = await new AlipayAdapter().verifyPayment(providerPaymentId, {
    transactionId: paymentId,
    paymentMethod: 'ALIPAY',
  });

  if (verification.status === 'unknown') {
    throw createError(502, verification.error ?? 'Unable to verify Alipay payment');
  }

  assertReconciled(payment, verification);

  const status = verification.status === 'success' ? 'success' : 'failed';
  const eventId =
    clean(data.eventId) ??
    `alipay:${providerPaymentId}:${data.paymentStatus?.trim().toLowerCase() ?? status}`;

  return transitionVerifiedPayment({
    paymentId,
    eventId,
    status,
    transactionId: clean(data.transactionId) ?? verification.transactionId,
  });
}

type WeChatWebhookBody = {
  id?: string;
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  eventId?: string;
  resource?: {
    out_trade_no?: string;
    transaction_id?: string;
    trade_state?: string;
  };
};

export async function processWeChatPayWebhook(body: WeChatWebhookBody) {
  const data = body.resource ?? body;
  const paymentId = clean(data.out_trade_no);
  const transactionId = clean(data.transaction_id);

  if (!paymentId) throw createError(400, 'WeChat Pay out_trade_no is required');
  if (!transactionId) throw createError(400, 'WeChat Pay transaction_id is required');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, amount: true, currency: true },
  });

  if (!payment) throw createError(404, 'Payment not found');

  const verification = await new WeChatPayAdapter().verifyPayment(transactionId, {
    transactionId: paymentId,
    paymentMethod: 'WECHAT_PAY',
  });

  if (verification.status === 'unknown') {
    throw createError(502, verification.error ?? 'Unable to verify WeChat Pay order');
  }

  assertReconciled(payment, verification);

  const status = verification.status === 'success' ? 'success' : 'failed';
  const eventId = clean(body.id) ?? `wechat:${transactionId}:${data.trade_state?.trim().toUpperCase() ?? status}`;

  return transitionVerifiedPayment({
    paymentId,
    eventId,
    status,
    transactionId: verification.transactionId ?? transactionId,
  });
}
