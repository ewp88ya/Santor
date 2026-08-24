import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const provider = { charge: vi.fn() };
  const prisma = {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prisma,
    provider,
    auditLog: vi.fn(),
    findLatestSuccessfulPaymentForSubscription: vi.fn(),
    routePaymentProvider: vi.fn(),
  };
});

vi.mock('../../../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../audit/audit.service.js', () => ({ auditLog: mocks.auditLog }));
vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlementInTransaction: vi.fn(),
}));
vi.mock('../payment.repository.js', () => ({
  findLatestSuccessfulPaymentForSubscription: mocks.findLatestSuccessfulPaymentForSubscription,
}));
vi.mock('../payment.router.js', () => ({ routePaymentProvider: mocks.routePaymentProvider }));
vi.mock('../payment.providers.js', () => ({
  paymentProviders: { globalCard: mocks.provider, xendit: mocks.provider, russia: mocks.provider },
}));

import { renewSubscription } from '../payment.renewal.service.js';

const subscription = {
  id: 'sub_timeout',
  userId: 'user_timeout',
  status: 'active',
  autoDebitEnabled: true,
  paymentCustomerId: 'cus_timeout',
  paymentMethodId: 'pm_timeout',
  renewalAttempts: 0,
  gracePeriodEnd: null,
  nextRenewalAttemptAt: null,
  endDate: new Date(Date.now() - 60_000),
  product: { price: 100, durationDays: 30 },
  license: { vpnAccess: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.subscription.findUnique.mockResolvedValue(subscription);
  mocks.prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.subscription.update.mockResolvedValue(subscription);
  mocks.prisma.payment.create.mockResolvedValue({ id: 'payment_timeout' });
  mocks.prisma.payment.update.mockResolvedValue({ id: 'payment_timeout', status: 'failed' });
  mocks.findLatestSuccessfulPaymentForSubscription.mockResolvedValue({
    id: 'previous_payment',
    country: 'US',
    currency: 'USD',
    paymentMethod: 'VISA',
  });
  mocks.routePaymentProvider.mockReturnValue(mocks.provider);
  mocks.provider.charge.mockRejectedValue(Object.assign(new Error('provider request timed out'), { code: 'ETIMEDOUT' }));
  mocks.auditLog.mockResolvedValue(undefined);
  mocks.prisma.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') return input(mocks.prisma);
    return Promise.all(input as Promise<unknown>[]);
  });
});

describe('Payment Auto-Debit / Provider Timeout', () => {
  it('treats provider timeout as a failed renewal and schedules recovery retry', async () => {
    const result = await renewSubscription('sub_timeout');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('provider request timed out');
    expect(result.attempts).toBe(1);

    expect(mocks.prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment_timeout' },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );

    expect(mocks.prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_timeout' },
        data: expect.objectContaining({
          renewalAttempts: 1,
          nextRenewalAttemptAt: expect.any(Date),
        }),
      }),
    );
  });
});
