import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  activateEntitlementMock,
  auditLogMock,
  findPaymentByIdForUserMock,
  listPaymentsMock,
  updatePaymentProviderMock,
  updatePaymentStatusMock,
  updateSubscriptionAutoDebitMock,
} = vi.hoisted(() => ({
  activateEntitlementMock: vi.fn(),
  auditLogMock: vi.fn(),
  findPaymentByIdForUserMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  updatePaymentProviderMock: vi.fn(),
  updatePaymentStatusMock: vi.fn(),
  updateSubscriptionAutoDebitMock: vi.fn(),
}));

vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlement: activateEntitlementMock,
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
  routePaymentProvider: vi.fn(),
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

describe('Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findPaymentByIdForUserMock.mockResolvedValue(buildPayment());

    updatePaymentStatusMock.mockResolvedValue(buildUpdatedPayment());

    activateEntitlementMock.mockResolvedValue({
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
  });

  describe('markPaymentSuccess', () => {
    it('marks the payment successful and activates the entitlement', async () => {
      const result = await markPaymentSuccess('payment-1', 'tx-001', 'user-1');

      expect(result).toEqual(buildUpdatedPayment());

      expect(findPaymentByIdForUserMock).toHaveBeenCalledTimes(1);
      expect(findPaymentByIdForUserMock).toHaveBeenCalledWith('payment-1', 'user-1');

      expect(updatePaymentStatusMock).toHaveBeenCalledTimes(1);
      expect(updatePaymentStatusMock).toHaveBeenCalledWith('payment-1', 'success', 'tx-001');

      expect(activateEntitlementMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementMock).toHaveBeenCalledWith('sub-1');

      expect(auditLogMock).toHaveBeenCalledTimes(1);
      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          transactionId: 'tx-001',
        },
      });
    });

    it('rejects when the payment does not belong to the user', async () => {
      findPaymentByIdForUserMock.mockResolvedValue(null);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment not found',
      );

      expect(updatePaymentStatusMock).not.toHaveBeenCalled();
      expect(activateEntitlementMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('does not write the success audit log when entitlement activation fails', async () => {
      const activationError = new Error('Entitlement activation failed');

      activateEntitlementMock.mockRejectedValue(activationError);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Entitlement activation failed',
      );

      expect(updatePaymentStatusMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementMock).toHaveBeenCalledTimes(1);
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('propagates payment status update failures without activating entitlement', async () => {
      const updateError = new Error('Payment update failed');

      updatePaymentStatusMock.mockRejectedValue(updateError);

      await expect(markPaymentSuccess('payment-1', 'tx-001', 'user-1')).rejects.toThrow(
        'Payment update failed',
      );

      expect(activateEntitlementMock).not.toHaveBeenCalled();
      expect(auditLogMock).not.toHaveBeenCalled();
    });

    it('activates the entitlement using the payment subscription ID', async () => {
      findPaymentByIdForUserMock.mockResolvedValue({
        ...buildPayment(),
        subscriptionId: 'subscription-specific-123',
      });

      await markPaymentSuccess('payment-1', 'tx-999', 'user-1');

      expect(activateEntitlementMock).toHaveBeenCalledTimes(1);
      expect(activateEntitlementMock).toHaveBeenCalledWith('subscription-specific-123');
    });

    it('passes the caller transaction ID to the payment update and audit log', async () => {
      await markPaymentSuccess('payment-1', 'transaction-xyz', 'user-1');

      expect(updatePaymentStatusMock).toHaveBeenCalledWith(
        'payment-1',
        'success',
        'transaction-xyz',
      );

      expect(auditLogMock).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PAYMENT_SUCCESS',
        resource: 'payment',
        resourceId: 'payment-1',
        metadata: {
          transactionId: 'transaction-xyz',
        },
      });
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

    it('rejects when the payment is not found', async () => {
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
