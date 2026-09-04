import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  auditLogMock,
  paymentFindFirstMock,
  paymentFindUniqueMock,
  paymentUpdateMock,
  prismaTransactionMock,
  refundExternalPaymentMock,
  revokeEntitlementInTransactionMock,
} = vi.hoisted(() => ({
  auditLogMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  paymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  refundExternalPaymentMock: vi.fn(),
  revokeEntitlementInTransactionMock: vi.fn(),
}));

vi.mock('../../../config/database.js', () => ({
  prisma: {
    payment: {
      findFirst: paymentFindFirstMock,
      findUnique: paymentFindUniqueMock,
      update: paymentUpdateMock,
    },
    $transaction: prismaTransactionMock,
  },
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

vi.mock('../../entitlement/entitlement.revocation.service.js', () => ({
  revokeEntitlementInTransaction: revokeEntitlementInTransactionMock,
}));

vi.mock('../payment.refund.provider.js', () => ({
  refundExternalPayment: refundExternalPaymentMock,
}));

import { refundPayment } from '../payment.refund.service.js';

function buildPayment(status = 'success') {
  return {
    id: 'payment-1',
    status,
    subscriptionId: 'sub-1',
    refundId: null,
    refundedAt: null,
    provider: 'GlobalCardAdapter',
    providerPaymentId: 'provider-payment-1',
    transactionId: 'transaction-1',
    amount: 100,
    currency: 'USD',
    paymentMethod: 'VISA',
    country: 'DE',
    subscription: {
      userId: 'user-1',
    },
  };
}

describe('Payment Refund Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    paymentFindFirstMock.mockResolvedValue(buildPayment());
    paymentFindUniqueMock.mockResolvedValue({
      id: 'payment-1',
      status: 'success',
      subscriptionId: 'sub-1',
      refundId: null,
    });
    paymentUpdateMock.mockResolvedValue({
      ...buildPayment('refunded'),
      refundId: 'refund-1',
      refundedAt: new Date('2026-08-24T12:00:00.000Z'),
    });
    refundExternalPaymentMock.mockResolvedValue({
      status: 'succeeded',
      refundId: 'provider-refund-1',
    });
    revokeEntitlementInTransactionMock.mockResolvedValue({
      subscriptionId: 'sub-1',
      revoked: true,
    });
    auditLogMock.mockResolvedValue(undefined);

    prismaTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        payment: {
          findUnique: paymentFindUniqueMock,
          update: paymentUpdateMock,
        },
      }),
    );
  });

  it('calls the external provider before marking the payment refunded', async () => {
    const result = await refundPayment({
      paymentId: 'payment-1',
      userId: 'user-1',
      refundId: 'refund-1',
      reason: 'customer request',
    });

    expect(refundExternalPaymentMock).toHaveBeenCalledWith({
      provider: 'GlobalCardAdapter',
      providerPaymentId: 'provider-payment-1',
      transactionId: 'transaction-1',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-1',
      reason: 'customer request',
    });
    expect(result.status).toBe('refunded');
    expect(result.refundId).toBe('refund-1');
    expect(prismaTransactionMock).toHaveBeenCalledTimes(1);
    expect(paymentUpdateMock).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: 'refunded',
        refundId: 'refund-1',
        refundedAt: expect.any(Date),
        refundReason: 'customer request',
      },
    });
    expect(revokeEntitlementInTransactionMock).toHaveBeenCalledWith('sub-1', expect.any(Object));
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_REFUNDED',
        resourceId: 'payment-1',
      }),
    );
  });

  it('does not mutate the database when the provider refund fails', async () => {
    refundExternalPaymentMock.mockResolvedValue({
      status: 'failed',
      error: 'provider refused refund',
    });

    await expect(
      refundPayment({
        paymentId: 'payment-1',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(paymentUpdateMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_REFUND_FAILED',
        resourceId: 'payment-1',
      }),
    );
  });

  it('does not mutate the database when the provider refund is pending', async () => {
    refundExternalPaymentMock.mockResolvedValue({
      status: 'pending',
      refundId: 'provider-refund-pending',
      error: 'provider refund is pending',
    });

    await expect(
      refundPayment({
        paymentId: 'payment-1',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(paymentUpdateMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_REFUND_PENDING',
        resourceId: 'payment-1',
      }),
    );
  });

  it('is idempotent when the payment is already refunded', async () => {
    const refunded = buildPayment('refunded');
    refunded.refundId = 'refund-existing';
    paymentFindFirstMock.mockResolvedValue(refunded);

    const result = await refundPayment({
      paymentId: 'payment-1',
      userId: 'user-1',
    });

    expect(result).toEqual(refunded);
    expect(refundExternalPaymentMock).not.toHaveBeenCalled();
    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it('does not repeat revocation or audit when another refund wins the transaction race', async () => {
    paymentFindUniqueMock.mockResolvedValue({
      id: 'payment-1',
      status: 'refunded',
      subscriptionId: 'sub-1',
      refundId: 'refund-winner',
    });

    const result = await refundPayment({
      paymentId: 'payment-1',
      userId: 'user-1',
      refundId: 'refund-loser',
    });

    expect(refundExternalPaymentMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'payment-1',
      status: 'refunded',
      subscriptionId: 'sub-1',
      refundId: 'refund-winner',
    });
    expect(paymentUpdateMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it('rejects non-successful payments without changing entitlement', async () => {
    paymentFindFirstMock.mockResolvedValue(buildPayment('pending'));

    await expect(
      refundPayment({
        paymentId: 'payment-1',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(refundExternalPaymentMock).not.toHaveBeenCalled();
    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
  });

  it('propagates entitlement failure so the refund transaction can roll back', async () => {
    revokeEntitlementInTransactionMock.mockRejectedValue(
      new Error('ENTITLEMENT_REVOCATION_FAILED'),
    );

    await expect(
      refundPayment({
        paymentId: 'payment-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('ENTITLEMENT_REVOCATION_FAILED');

    expect(refundExternalPaymentMock).toHaveBeenCalledTimes(1);
    expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
    expect(revokeEntitlementInTransactionMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_REFUNDED',
      }),
    );
  });
});
