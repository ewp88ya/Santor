import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { generateLicense } from '../license/license.service.js';

export type PaymentWebhookEvent = {
  eventId: string;
  type: 'payment.success' | 'payment.failed';
  paymentId: string;
  transactionId?: string;
};

export async function processPaymentWebhook(event: PaymentWebhookEvent) {
  if (!event.eventId) {
    throw createError(400, 'Webhook event ID is required');
  }

  const existing = await prisma.payment.findFirst({
    where: {
      webhookEventId: event.eventId,
    },
  });

  if (existing) {
    return {
      processed: true,
      duplicate: true,
      paymentId: existing.id,
    };
  }

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

  if (event.type === 'payment.failed') {
    const updated = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'failed',
        transactionId: event.transactionId,
        webhookEventId: event.eventId,
      },
    });

    await auditLog({
      userId: payment.subscription.userId,
      action: 'payment.webhook.failed',
      resource: 'payment',
      resourceId: payment.id,
      metadata: {
        eventId: event.eventId,
        transactionId: event.transactionId,
      },
    });

    return {
      processed: true,
      duplicate: false,
      paymentId: updated.id,
    };
  }

  const updated = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: 'success',
      transactionId: event.transactionId,
      webhookEventId: event.eventId,
    },
  });

  await generateLicense(payment.subscriptionId);

  await auditLog({
    userId: payment.subscription.userId,
    action: 'payment.webhook.success',
    resource: 'payment',
    resourceId: payment.id,
    metadata: {
      eventId: event.eventId,
      transactionId: event.transactionId,
    },
  });

  return {
    processed: true,
    duplicate: false,
    paymentId: updated.id,
  };
}
