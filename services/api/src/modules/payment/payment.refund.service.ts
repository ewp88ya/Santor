import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { revokeEntitlementInTransaction } from '../entitlement/entitlement.revocation.service.js';
import { refundExternalPayment } from './payment.refund.provider.js';

export async function refundPayment(data: {
  paymentId: string;
  userId: string;
  reason?: string;
  refundId?: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: data.paymentId,
      subscription: {
        userId: data.userId,
      },
    },
    select: {
      id: true,
      status: true,
      subscriptionId: true,
      refundId: true,
      refundedAt: true,
      provider: true,
      providerPaymentId: true,
      transactionId: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      country: true,
      subscription: {
        select: { userId: true },
      },
    },
  });

  if (!payment) throw createError(404, 'Payment not found');

  if (payment.status === 'refunded') {
    return payment;
  }

  if (payment.status !== 'success') {
    throw createError(409, 'Only successful payments can be refunded');
  }

  if (!payment.providerPaymentId) {
    throw createError(409, 'Payment does not have a provider payment ID');
  }

  const refundId = data.refundId?.trim() || `refund_${data.paymentId}`;
  const reason = data.reason?.trim() || undefined;

  const externalRefund = await refundExternalPayment({
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    transactionId: payment.transactionId ?? undefined,
    amount: payment.amount,
    currency: payment.currency,
    referenceId: payment.id,
    refundId,
    paymentMethod: payment.paymentMethod ?? undefined,
    reason,
  });

  if (externalRefund.status === 'pending') {
    await auditLog({
      userId: data.userId,
      action: 'PAYMENT_REFUND_PENDING',
      resource: 'payment',
      resourceId: data.paymentId,
      metadata: {
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        refundId,
        providerRefundId: externalRefund.refundId,
        reason,
      },
    });

    throw createError(409, externalRefund.error ?? 'Payment refund is pending provider confirmation');
  }

  if (externalRefund.status !== 'succeeded') {
    await auditLog({
      userId: data.userId,
      action: 'PAYMENT_REFUND_FAILED',
      resource: 'payment',
      resourceId: data.paymentId,
      metadata: {
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        refundId,
        reason,
        error: externalRefund.error,
      },
    });

    throw createError(502, externalRefund.error ?? 'Payment provider refund failed');
  }

  const { payment: updated, didRefund } = await prisma.$transaction(
    async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: data.paymentId },
        select: { id: true, status: true, subscriptionId: true, refundId: true },
      });

      if (!current) throw createError(404, 'Payment not found');
      if (current.status === 'refunded') {
        return { payment: current, didRefund: false };
      }
      if (current.status !== 'success') {
        throw createError(409, 'Only successful payments can be refunded');
      }

      const result = await tx.payment.update({
        where: { id: current.id },
        data: {
          status: 'refunded',
          refundId,
          refundedAt: new Date(),
          refundReason: reason,
        },
      });

      await revokeEntitlementInTransaction(current.subscriptionId, tx);

      return { payment: result, didRefund: true };
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );

  if (didRefund) {
    await auditLog({
      userId: data.userId,
      action: 'PAYMENT_REFUNDED',
      resource: 'payment',
      resourceId: data.paymentId,
      metadata: {
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        providerRefundId: externalRefund.refundId,
        refundId,
        reason,
        entitlementRevoked: true,
      },
    });
  }

  return updated;
}
