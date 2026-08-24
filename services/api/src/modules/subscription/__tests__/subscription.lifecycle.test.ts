import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findSubscriptionByIdMock,
  cancelSubscriptionMock,
  prismaFindManyMock,
  prismaTransactionMock,
  revokeEntitlementInTransactionMock,
} = vi.hoisted(() => ({
  findSubscriptionByIdMock: vi.fn(),
  cancelSubscriptionMock: vi.fn(),
  prismaFindManyMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  revokeEntitlementInTransactionMock: vi.fn(),
}));

vi.mock('../subscription.repository.js', () => ({
  findSubscriptionById: findSubscriptionByIdMock,
  cancelSubscription: cancelSubscriptionMock,
}));

vi.mock('../../../config/database.js', () => ({
  prisma: {
    subscription: {
      findMany: prismaFindManyMock,
    },
    $transaction: prismaTransactionMock,
  },
}));

vi.mock('../../entitlement/entitlement.revocation.service.js', () => ({
  revokeEntitlementInTransaction: revokeEntitlementInTransactionMock,
}));

import { cancelUserSubscription } from '../subscription.service.js';
import { expireSubscriptions } from '../subscription.expire.service.js';

describe('Subscription Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSubscriptionByIdMock.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      status: 'active',
    });
    cancelSubscriptionMock.mockResolvedValue({ id: 'sub-1', status: 'cancelled' });
    prismaFindManyMock.mockResolvedValue([]);
    revokeEntitlementInTransactionMock.mockResolvedValue({ subscriptionId: 'sub-1', revoked: true });
  });

  it('cancels an active subscription through the atomic repository lifecycle', async () => {
    const result = await cancelUserSubscription('user-1', 'sub-1');

    expect(result).toEqual({ id: 'sub-1', status: 'cancelled' });
    expect(cancelSubscriptionMock).toHaveBeenCalledWith('sub-1');
  });

  it('rejects cancellation by another user', async () => {
    await expect(cancelUserSubscription('user-2', 'sub-1')).rejects.toMatchObject({ statusCode: 403 });
    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
  });

  it('does not expire an auto-debit subscription while grace is active', async () => {
    const now = new Date();
    prismaFindManyMock.mockResolvedValue([
      {
        id: 'sub-1',
        status: 'active',
        endDate: new Date(now.getTime() - 60_000),
        autoDebitEnabled: true,
        gracePeriodEnd: new Date(now.getTime() + 60_000),
      },
    ]);

    const result = await expireSubscriptions();

    expect(result).toBe(0);
    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(revokeEntitlementInTransactionMock).not.toHaveBeenCalled();
  });

  it('expires an eligible subscription and revokes entitlement in one transaction', async () => {
    const now = new Date();
    prismaFindManyMock.mockResolvedValue([
      {
        id: 'sub-1',
        status: 'active',
        endDate: new Date(now.getTime() - 60_000),
        autoDebitEnabled: false,
        gracePeriodEnd: null,
      },
    ]);

    const updateMock = vi.fn().mockResolvedValue(undefined);
    const findUniqueMock = vi.fn().mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      endDate: new Date(now.getTime() - 60_000),
      autoDebitEnabled: false,
      gracePeriodEnd: null,
    });

    prismaTransactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          subscription: {
            findUnique: findUniqueMock,
            update: updateMock,
          },
        }),
    );

    const result = await expireSubscriptions();

    expect(result).toBe(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'expired' },
    });
    expect(revokeEntitlementInTransactionMock).toHaveBeenCalledWith('sub-1', expect.any(Object));
  });
});
