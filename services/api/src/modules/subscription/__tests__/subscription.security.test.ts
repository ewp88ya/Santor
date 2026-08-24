import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = {
  findSubscriptionById: vi.fn(),
  cancelSubscription: vi.fn(),
  createSubscription: vi.fn(),
  findUserSubscriptions: vi.fn(),
};

vi.mock('../subscription.repository.js', () => repositoryMock);

import { cancelUserSubscription, getSubscription } from '../subscription.service.js';

describe('Phase 12 — subscription ownership security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects cancellation of another user subscription', async () => {
    repositoryMock.findSubscriptionById.mockResolvedValue({
      id: 'sub-1',
      userId: 'owner-1',
      status: 'active',
    });

    await expect(cancelUserSubscription('attacker-1', 'sub-1')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });
    expect(repositoryMock.cancelSubscription).not.toHaveBeenCalled();
  });

  it('allows the subscription owner to cancel an active subscription', async () => {
    repositoryMock.findSubscriptionById.mockResolvedValue({
      id: 'sub-1',
      userId: 'owner-1',
      status: 'active',
    });
    repositoryMock.cancelSubscription.mockResolvedValue({ id: 'sub-1', status: 'cancelled' });

    await expect(cancelUserSubscription('owner-1', 'sub-1')).resolves.toEqual({
      id: 'sub-1',
      status: 'cancelled',
    });
  });

  it('does not treat the subscription lookup itself as an authorization boundary', async () => {
    repositoryMock.findSubscriptionById.mockResolvedValue({
      id: 'sub-1',
      userId: 'owner-1',
      status: 'active',
    });

    await expect(getSubscription('sub-1')).resolves.toMatchObject({
      id: 'sub-1',
      userId: 'owner-1',
    });
  });
});
