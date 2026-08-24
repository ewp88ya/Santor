import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { auditLog } from '../audit/audit.service.js';
import { revokeEntitlementInTransaction } from '../entitlement/entitlement.revocation.service.js';

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
      providerPaymentId: true,
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

  const refundId = data.refundId?.trim() || `refund_${data.paymentId}`;
  const reason = data.reason?.trim() || undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: data.paymentId },
      select: { id: true, status: true, subscriptionId: true, refundId: true },
    });

    if (!current) throw createError(404, 'Payment not found');
    if (current.status === 'refunded') return current;
    if (current.status !== 'success') throw createError(409, 'Only successful payments can be refunded');

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

    return result;
  }, {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  });

  await auditLog({
    userId: data.userId,
    action: 'PAYMENT_REFUNDED',
    resource: 'payment',
    resourceId: data.paymentId,
    metadata: {
      refundId,
      reason,
      providerPaymentId: payment.providerPaymentId,
      entitlementRevoked: true,
    },
  });

  return updated;
}
