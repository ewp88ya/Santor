import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  activateEntitlementInTransactionMock,
  auditLogMock,
  findPaymentByIdForUserMock,
  listPaymentsMock,
  updatePaymentProviderMock,
  updatePaymentStatusMock,
  updateSubscriptionAutoDebitMock,
  routePaymentProviderMock,
  prismaTransactionMock,
  paymentFindUniqueMock,
  paymentUpdateMock,
} = vi.hoisted(() => ({
  activateEntitlementInTransactionMock: vi.fn(),
  auditLogMock: vi.fn(),
  findPaymentByIdForUserMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  updatePaymentProviderMock: vi.fn(),
  updatePaymentStatusMock: vi.fn(),
  updateSubscriptionAutoDebitMock: vi.fn(),
  routePaymentProviderMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  paymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
}));

vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlement: vi.fn(),
  activateEntitlementInTransaction: activateEntitlementInTransactionMock,
}));

vi.mock('../../../config/database.js', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}));

vi.mock('../payment.repository.js', () => ({
  createPayment: vi.fn(),
  findPaymentByIdForUser: findPaymentByIdForUserMock,
  listPayments: listPaymentsMock,
  updatePaymentProvider: updatePaymentProviderMock,
  updatePaymentStatus: updatePaymentStatusMock,
  updateSubscriptionAutoDebit: updateSubscriptionAutoDebitMock,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

vi.mock('../payment.router.js', () => ({
  routePaymentProvider: routePaymentProviderMock,
}));

vi.mock('../providers/index.js', () => ({
  GlobalCardAdapter: vi.fn(),
  PayPalAdapter: vi.fn(),
  XenditAdapter: vi.fn(),
  RussiaPaymentAdapter: vi.fn(),
}));

import { getPayment, getPayments, markPaymentSuccess } from '../payment.service.js';

function buildPayment() {
  return {
    id: 'payment-1',
    subscriptionId: 'sub-1',
    status: 'pending',
    transactionId: null,
    provider: 'TestProvider',
    providerPaymentId: 'provider-payment-1',
    country: 'US',
    paymentMethod: 'card',
    currency: 'USD',
    amount: 100,
    subscription: {
      id: 'sub-1',
      userId: 'user-1',
    },
  };
}

function buildUpdatedPayment() {
  return {
    ...buildPayment(),
    status: 'success',
    transactionId: 'tx-001',
  };
}

function buildVerifiedPayment() {
  return {
    status: 'success',
    providerPaymentId: 'provider-payment-1',
    transactionId: 'tx-001',
    referenceId: 'payment-1',
    amount: 100,
    currency: 'USD',
  };
}

function buildTransactionClient() {
  return {
    payment: {
      findUnique: paymentFindUniqueMock,
      update: paymentUpdateMock,
    },
  };
}

describe('Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    routePaymentProviderMock.mockReturnValue({
      verifyPayment: vi.fn().mockResolvedValue(buildVerifiedPayment()),
    });

    findPaymentByIdForUserMock.mockResolvedValue(buildPayment());

    updatePaymentStatusMock.mockResolvedValue(buildUpdatedPayment());

    activateEntitlementInTransactionMock.mockResolvedValue({
      id: 'sub-1',
      mode: 'general',
    });

    auditLogMock.mockResolvedValue(undefined);

    listPaymentsMock.mockResolvedValue([]);
    updatePaymentProviderMock.mockResolvedValue(buildPayment());

    updateSubscriptionAutoDebitMock.mockResolvedValue({
      id: 'sub-1',
      autoDebitEnabled: true,
    });

    paymentFindUniqueMock.mockResolvedValue({
      id: 'payment-1',
      status: 'pending',
      subscriptionId: 'sub-1',
      providerPaymentId: 'provider-payment-1',
      transactionId: null,
    });

    paymentUpdateMock.mockResolvedValue(buildUpdatedPayment());

    prismaTransactionMock.mockImplementation(
      async (callback: (tx: ReturnType<typeof buildTransactionClient>) => Promise<unknown>) => {
        return callback(buildTransactionClient());
      },
    );
  });

  describe('markPaymentSuccess', () => {
    it('executes payment success and entitlement activation inside one transaction', async () => {
      const result = await markPaymentSuccess('payment-1', 'tx-001', 'user-1');

      expect(result).toEqual(buildUpdatedPayment());

      expect(findPaymentByIdForUserMock).toHaveBeenCalledTimes(1);
      expect(findPaymentByIdForUserMock).toHaveBeenCalledWith('payment-1', 'user-1');

      expect(routePaymentProviderMock).toHaveBeenCalledTimes(1);
      expect(routePaymentProviderMock).toHaveBeenCalledWith(
        'US',
        'card',
        expect.objectContaining({
          globalCard: expect.anything(),
          paypal: expect.anything(),
          russia: expect.anything(),
          xendit: expect.anything(),
        }),
      );

      const provider = routePaymentProviderMock.mock.results[0].value;

      expect(provider.verifyPayment).toHaveBeenCalledTimes(1);
      expect(provider.verifyPayment).toHaveBeenCalledWith('provider-payment-1');

      expect(prismaTransactionMock).toHaveBeenCalledTimes(1);

      expect(paymentFindUniqueMock).toHaveBeenCalledTimes(1);
      expect(paymentFindUniqueMock).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        select: {
          id: true,
          status: true,
          subscriptionId: true,
          providerPaymentId: true,
          transactionId: true,
        },
      });

      expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
      expect(paymentUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        data: {
          status: 'success',
          transactionId: 'tx-001',
        },
      });

      expect(activateEntitlementInTransactionMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementInTransactionMock).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          payment: expect.objectContaining({
            findUnique: paymentFindUniqueMock,
            update: paymentUpdateMock,
          }),
        }),
      );

      expect(updatePaymentStatusMock).not.toHaveBeenCalled();

      expect(auditLogMock).toHaveBeenCalledTimes(1);
      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          transactionId: 'tx-001',
          providerPaymentId: 'provider-payment-1',
          verified: true,
          providerStatus: 'success',
        },
      });
    });

    it('rolls back the lifecycle when entitlement activation fails', async () => {
      const activationError = new Error('Entitlement activation failed');

      activateEntitlementInTransactionMock.mockRejectedValue(activationError);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Entitlement activation failed',
      );

      expect(prismaTransactionMock).toHaveBeenCalledTimes(1);

      expect(paymentUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        data: {
          status: 'success',
          transactionId: 'tx-001',
        },
      });

      expect(activateEntitlementInTransactionMock).toHaveBeenCalledTimes(1);

      /*
       * No success audit is emitted because the transaction failed.
       */
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('does not mutate payment when transaction payment state is no longer pending', async () => {
      paymentFindUniqueMock.mockResolvedValue({
        id: 'payment-1',
        status: 'success',
        subscriptionId: 'sub-1',
        providerPaymentId: 'provider-payment-1',
        transactionId: 'tx-existing',
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment is not pending',
      );

      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('rejects when the payment does not belong to the user', async () => {
      findPaymentByIdForUserMock.mockResolvedValue(null);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment not found',
      );

      expect(routePaymentProviderMock).not.toHaveBeenCalled();
      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('rejects when the payment is not pending', async () => {
      findPaymentByIdForUserMock.mockResolvedValue({
        ...buildPayment(),
        status: 'success',
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment is not pending',
      );

      expect(routePaymentProviderMock).not.toHaveBeenCalled();
      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('rejects when the payment has no provider payment ID', async () => {
      findPaymentByIdForUserMock.mockResolvedValue({
        ...buildPayment(),
        providerPaymentId: null,
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment does not have a provider payment ID',
      );

      expect(routePaymentProviderMock).not.toHaveBeenCalled();
      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('rejects when provider verification fails', async () => {
      const verificationError = new Error('PROVIDER_UNAVAILABLE');

      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockRejectedValue(verificationError),
      });

      await expect(markPaymentSuccess('payment-1', 'attacker-tx', 'user-1')).rejects.toThrow(
        'PROVIDER_UNAVAILABLE',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('rejects unknown provider verification', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'unknown',
          error: 'Provider verification unavailable',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'attacker-tx', 'user-1')).rejects.toThrow(
        'Provider verification unavailable',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS_VERIFICATION_FAILED',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          provider: 'TestProvider',
          providerPaymentId: 'provider-payment-1',
          reason: 'Provider verification unavailable',
        },
      });
    });

    it('rejects non-success provider status', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'failed',
          providerPaymentId: 'provider-payment-1',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment provider status is failed',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS_VERIFICATION_REJECTED',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          provider: 'TestProvider',
          providerPaymentId: 'provider-payment-1',
          providerStatus: 'failed',
        },
      });
    });

    it('rejects provider payment ID mismatch', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          providerPaymentId: 'different-provider-payment',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Provider payment ID mismatch',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS_VERIFICATION_MISMATCH',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          reason: 'PROVIDER_PAYMENT_ID_MISMATCH',
          expectedProviderPaymentId: 'provider-payment-1',
          providerPaymentId: 'different-provider-payment',
        },
      });
    });

    it('rejects reference ID mismatch', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          referenceId: 'different-payment-id',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment reference ID mismatch',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects amount mismatch', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          amount: 999,
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment amount mismatch',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects currency mismatch', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          currency: 'EUR',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment currency mismatch',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects transaction ID mismatch', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          transactionId: 'real-provider-tx',
        }),
      });

      await expect(markPaymentSuccess('payment-1', 'fake-attacker-tx', 'user-1')).rejects.toThrow(
        'Payment transaction ID mismatch',
      );

      expect(prismaTransactionMock).not.toHaveBeenCalled();
      expect(paymentUpdateMock).not.toHaveBeenCalled();
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
    });

    it('uses the verified provider transaction ID as source of truth', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          ...buildVerifiedPayment(),
          transactionId: 'real-provider-tx',
        }),
      });

      await markPaymentSuccess('payment-1', 'real-provider-tx', 'user-1');

      expect(paymentUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        data: {
          status: 'success',
          transactionId: 'real-provider-tx',
        },
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_SUCCESS',
          metadata: expect.objectContaining({
            transactionId: 'real-provider-tx',
          }),
        }),
      );
    });

    it('falls back to caller transaction ID when provider does not return one', async () => {
      routePaymentProviderMock.mockReturnValue({
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'success',
          providerPaymentId: 'provider-payment-1',
          referenceId: 'payment-1',
          amount: 100,
          currency: 'USD',
        }),
      });

      await markPaymentSuccess('payment-1', 'tx-fallback', 'user-1');

      expect(paymentUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        data: {
          status: 'success',
          transactionId: 'tx-fallback',
        },
      });
    });

    it('does not emit success audit when entitlement activation fails', async () => {
      activateEntitlementInTransactionMock.mockRejectedValue(
        new Error('Entitlement activation failed'),
      );

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Entitlement activation failed',
      );

      expect(prismaTransactionMock).toHaveBeenCalledTimes(1);
      expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementInTransactionMock).toHaveBeenCalledTimes(1);

      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('does not activate entitlement when the transaction payment update fails', async () => {
      const updateError = new Error('Payment update failed');

      paymentUpdateMock.mockRejectedValue(updateError);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment update failed',
      );

      expect(prismaTransactionMock).toHaveBeenCalledTimes(1);
      expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('uses the payment subscription ID from the transaction', async () => {
      paymentFindUniqueMock.mockResolvedValue({
        id: 'payment-1',
        status: 'pending',
        subscriptionId: 'subscription-specific-123',
        providerPaymentId: 'provider-payment-1',
        transactionId: null,
      });

      await markPaymentSuccess('payment-1', 'tx-001', 'user-1');

      expect(activateEntitlementInTransactionMock).toHaveBeenCalledWith(
        'subscription-specific-123',
        expect.anything(),
      );
    });
  });

  describe('getPayment', () => {
    it('returns a payment belonging to the user', async () => {
      const payment = buildPayment();

      findPaymentByIdForUserMock.mockResolvedValue(payment);

      const result = await getPayment('payment-1', 'user-1');

      expect(result).toEqual(payment);
      expect(findPaymentByIdForUserMock).toHaveBeenCalledWith('payment-1', 'user-1');
    });

    it('rejects when payment is not found', async () => {
      findPaymentByIdForUserMock.mockResolvedValue(null);

      await expect(getPayment('payment-1', 'user-1')).rejects.toThrow('Payment not found');
    });
  });

  describe('getPayments', () => {
    it('returns payments for the user', async () => {
      const payments = [buildPayment()];

      listPaymentsMock.mockResolvedValue(payments);

      const result = await getPayments('user-1');

      expect(result).toEqual(payments);
      expect(listPaymentsMock).toHaveBeenCalledTimes(1);
      expect(listPaymentsMock).toHaveBeenCalledWith('user-1');
    });
  });
});
