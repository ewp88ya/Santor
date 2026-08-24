import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  auditLogMock,
  paymentFindFirstMock,
  paymentFindUniqueMock,
  paymentUpdateMock,
  prismaTransactionMock,
  revokeEntitlementInTransactionMock,
} = vi.hoisted(() => ({
  auditLogMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  paymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
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

import { refundPayment } from '../payment.refund.service.js';

function buildPayment(status = 'success') {
  return {
    id: 'payment-1',
    status,
    subscriptionId: 'sub-1',
    refundId: null,
    refundedAt: null,
    providerPaymentId: 'provider-payment-1',
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
    revokeEntitlementInTransactionMock.mockResolvedValue({
      subscriptionId: 'sub-1',
      revoked: true,
    });
    auditLogMock.mockResolvedValue(undefined);

    prismaTransactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          payment: {
            findUnique: paymentFindUniqueMock,
            update: paymentUpdateMock,
          },
        }),
    );
  });

  it('marks a successful payment refunded and revokes entitlement atomically', async () => {
    const result = await refundPayment({
      paymentId: 'payment-1',
      userId: 'user-1',
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
    expect(revokeEntitlementInTransactionMock).toHaveBeenCalledWith(
      'sub-1',
      expect.any(Object),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_REFUNDED',
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

    expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
    expect(revokeEntitlementInTransactionMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});
