import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockProvider = {
    charge: vi.fn(),
    verifyPayment: vi.fn(),
  };

  const mockPrisma = {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    vPNAccess: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    mockPrisma,
    mockProvider,
    mockAuditLog: vi.fn(),
    mockFindLatestSuccessfulPaymentForSubscription: vi.fn(),
    mockRoutePaymentProvider: vi.fn(),
  };
});

/**
 * IMPORTANT:
 * These mock paths must resolve to the exact same modules imported
 * by payment.renewal.service.ts.
 */
vi.mock('../../../config/database.js', () => ({
  prisma: mocks.mockPrisma,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: mocks.mockAuditLog,
}));

vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlementInTransaction: vi.fn().mockResolvedValue({
    subscriptionId: 'sub_123',
    status: 'active',
  }),
}));

vi.mock('../payment.repository.js', () => ({
  findLatestSuccessfulPaymentForSubscription: mocks.mockFindLatestSuccessfulPaymentForSubscription,
}));

vi.mock('../payment.router.js', () => ({
  routePaymentProvider: mocks.mockRoutePaymentProvider,
}));

vi.mock('../payment.providers.js', () => ({
  paymentProviders: {
    globalCard: mocks.mockProvider,
    xendit: mocks.mockProvider,
    russia: mocks.mockProvider,
  },
}));

import { renewSubscription } from '../payment.renewal.service.js';

const mockSubscription = {
  id: 'sub_123',
  userId: 'user_123',
  status: 'active',
  autoDebitEnabled: true,
  paymentCustomerId: 'cus_123',
  paymentMethodId: 'pm_123',
  renewalAttempts: 0,
  gracePeriodEnd: null,
  nextRenewalAttemptAt: null,
  endDate: new Date('2026-08-10T00:00:00.000Z'),
  product: {
    price: 100,
    durationDays: 30,
  },
  license: {
    vpnAccess: {
      id: 'vpn_123',
    },
  },
};

const mockPreviousPayment = {
  id: 'payment_previous',
  subscriptionId: 'sub_123',
  status: 'success',
  provider: 'RussiaPaymentAdapter',
  country: 'RU',
  currency: 'RUB',
  paymentMethod: 'SBP',
  amount: 100,
};

const mockPayment = {
  id: 'payment_renewal',
};

function resetSubscription(overrides: Record<string, unknown> = {}) {
  return {
    ...mockSubscription,
    ...overrides,
  };
}

function setupSuccessfulTransaction() {
  mocks.mockPrisma.$transaction.mockImplementation(
    async (input: Promise<unknown>[] | ((tx: typeof mocks.mockPrisma) => Promise<unknown>)) => {
      if (typeof input === 'function') {
        return input(mocks.mockPrisma);
      }

      return Promise.all(input);
    },
  );

  mocks.mockPrisma.payment.findUnique.mockImplementation(
    async (args: { where?: { id?: string } }) => {
      if (args.where?.id === mockPayment.id) {
        return {
          ...mockPayment,
          status: 'pending',
        };
      }

      return null;
    },
  );

  mocks.mockPrisma.payment.update.mockResolvedValue({
    ...mockPayment,
    status: 'success',
  });

  mocks.mockPrisma.subscription.update.mockResolvedValue({
    ...mockSubscription,
    renewalAttempts: 0,
  });

  mocks.mockPrisma.vPNAccess.update.mockResolvedValue({
    id: 'vpn_123',
    active: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockPrisma.subscription.findUnique.mockResolvedValue(resetSubscription());

  mocks.mockPrisma.subscription.updateMany.mockResolvedValue({
    count: 1,
  });

  mocks.mockPrisma.subscription.update.mockResolvedValue(resetSubscription());

  mocks.mockPrisma.payment.create.mockResolvedValue(mockPayment);

  mocks.mockPrisma.payment.findUnique.mockImplementation(
    async (args: { where?: { id?: string } }) => {
      if (args.where?.id === mockPayment.id) {
        return {
          ...mockPayment,
          status: 'pending',
        };
      }

      return null;
    },
  );

  mocks.mockPrisma.payment.update.mockResolvedValue(mockPayment);

  mocks.mockPrisma.payment.findUnique.mockResolvedValue({
    ...mockPayment,
    status: 'pending',
  });

  mocks.mockPrisma.vPNAccess.update.mockResolvedValue({
    id: 'vpn_123',
    active: true,
  });

  mocks.mockAuditLog.mockResolvedValue(undefined);

  mocks.mockFindLatestSuccessfulPaymentForSubscription.mockResolvedValue(mockPreviousPayment);

  mocks.mockRoutePaymentProvider.mockReturnValue(mocks.mockProvider);

  mocks.mockProvider.charge.mockResolvedValue({
    success: true,
    transactionId: 'tx_success',
    providerPaymentId: 'provider_payment_123',
  });

  mocks.mockProvider.verifyPayment.mockResolvedValue({
    status: 'success',
  });

  setupSuccessfulTransaction();
});

describe('Payment Auto-Debit / Renewal', () => {
  it('routes renewal through the provider registry using the previous successful payment context', async () => {
    await renewSubscription('sub_123');

    expect(mocks.mockFindLatestSuccessfulPaymentForSubscription).toHaveBeenCalledWith('sub_123');

    expect(mocks.mockRoutePaymentProvider).toHaveBeenCalledWith(
      'RU',
      'SBP',
      expect.objectContaining({
        globalCard: expect.anything(),
        xendit: expect.anything(),
        russia: expect.anything(),
      }),
      'RUB',
    );

    expect(mocks.mockProvider.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_123',
        paymentMethodId: 'pm_123',
        amount: 100,
        country: 'RU',
        currency: 'RUB',
        paymentMethod: 'SBP',
        referenceId: 'payment_renewal',
      }),
    );
  });

  it('renews successfully and resets retry/grace state', async () => {
    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(true);
    expect(result.transactionId).toBe('tx_success');

    expect(mocks.mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'payment_renewal',
        },
        data: expect.objectContaining({
          status: 'success',
          transactionId: 'tx_success',
          providerPaymentId: 'provider_payment_123',
        }),
      }),
    );

    expect(mocks.mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sub_123',
        },
        data: expect.objectContaining({
          status: 'active',
          renewalAttempts: 0,
          gracePeriodEnd: null,
          nextRenewalAttemptAt: null,
        }),
      }),
    );
  });

  it('handles provider failure and schedules a retry', async () => {
    mocks.mockProvider.charge.mockResolvedValue({
      success: false,
      providerPaymentId: 'provider_failed',
      error: 'CARD_DECLINED',
    });

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('CARD_DECLINED');
    expect(result.attempts).toBe(1);

    expect(mocks.mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'payment_renewal',
        },
        data: expect.objectContaining({
          status: 'failed',
          providerPaymentId: 'provider_failed',
        }),
      }),
    );

    expect(mocks.mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sub_123',
        },
        data: expect.objectContaining({
          renewalAttempts: 1,
          nextRenewalAttemptAt: expect.any(Date),
        }),
      }),
    );
  });

  it('increments retry attempts after repeated provider failure', async () => {
    mocks.mockPrisma.subscription.findUnique.mockResolvedValue(
      resetSubscription({
        renewalAttempts: 1,
      }),
    );

    mocks.mockProvider.charge.mockResolvedValue({
      success: false,
      error: 'PAYMENT_FAILED',
    });

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.attempts).toBe(2);

    expect(mocks.mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sub_123',
        },
        data: expect.objectContaining({
          renewalAttempts: 2,
          nextRenewalAttemptAt: expect.any(Date),
        }),
      }),
    );
  });

  it('enters grace period after the third failed attempt', async () => {
    mocks.mockPrisma.subscription.findUnique.mockResolvedValue(
      resetSubscription({
        renewalAttempts: 2,
      }),
    );

    mocks.mockProvider.charge.mockResolvedValue({
      success: false,
      error: 'PAYMENT_FAILED',
    });

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.gracePeriodDays).toBe(3);

    expect(mocks.mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sub_123',
        },
        data: expect.objectContaining({
          renewalAttempts: 3,
          gracePeriodEnd: expect.any(Date),
          nextRenewalAttemptAt: null,
        }),
      }),
    );
  });

  it('does not charge again after maximum attempts are already reached', async () => {
    mocks.mockPrisma.subscription.findUnique.mockResolvedValue(
      resetSubscription({
        renewalAttempts: 3,
      }),
    );

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('MAX_RENEWAL_ATTEMPTS_REACHED');

    expect(mocks.mockProvider.charge).not.toHaveBeenCalled();
    expect(mocks.mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('skips renewal when auto-debit is disabled', async () => {
    mocks.mockPrisma.subscription.findUnique.mockResolvedValue(
      resetSubscription({
        autoDebitEnabled: false,
      }),
    );

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('AUTO_DEBIT_DISABLED');

    expect(mocks.mockProvider.charge).not.toHaveBeenCalled();
    expect(mocks.mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('enters grace period when payment method credentials are missing', async () => {
    mocks.mockPrisma.subscription.findUnique.mockResolvedValue(
      resetSubscription({
        paymentCustomerId: null,
        paymentMethodId: null,
      }),
    );

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('PAYMENT_METHOD_NOT_CONFIGURED');
    expect(result.gracePeriodDays).toBe(3);

    expect(mocks.mockProvider.charge).not.toHaveBeenCalled();

    expect(mocks.mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sub_123',
        },
        data: expect.objectContaining({
          gracePeriodEnd: expect.any(Date),
          nextRenewalAttemptAt: null,
        }),
      }),
    );
  });

  it('enters grace period when successful payment routing context is missing', async () => {
    mocks.mockFindLatestSuccessfulPaymentForSubscription.mockResolvedValue(null);

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('PAYMENT_ROUTING_CONTEXT_NOT_FOUND');
    expect(result.gracePeriodDays).toBe(3);

    expect(mocks.mockProvider.charge).not.toHaveBeenCalled();
  });

  it('prevents concurrent renewal execution with an atomic claim', async () => {
    mocks.mockPrisma.subscription.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await renewSubscription('sub_123');

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('RENEWAL_ALREADY_CLAIMED');

    expect(mocks.mockFindLatestSuccessfulPaymentForSubscription).not.toHaveBeenCalled();

    expect(mocks.mockProvider.charge).not.toHaveBeenCalled();
    expect(mocks.mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('creates renewal payment with routing context before charging provider', async () => {
    await renewSubscription('sub_123');

    expect(mocks.mockPrisma.payment.create).toHaveBeenCalledWith({
      data: {
        subscriptionId: 'sub_123',
        provider: 'Object',
        country: 'RU',
        currency: 'RUB',
        paymentMethod: 'SBP',
        amount: 100,
        status: 'pending',
        type: 'renewal',
        autoDebit: true,
      },
    });

    expect(mocks.mockProvider.charge).toHaveBeenCalled();
  });
});
