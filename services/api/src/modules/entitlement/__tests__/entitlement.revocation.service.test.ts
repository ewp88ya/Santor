import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: {
      findUnique: vi.fn(),
    },
    license: {
      update: vi.fn(),
    },
    vPNAccess: {
      update: vi.fn(),
    },
    device: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
  );

  return { prismaMock };
});

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

import {
  revokeEntitlement,
  revokeEntitlementInTransaction,
} from '../entitlement.revocation.service.js';

function buildSubscription() {
  return {
    id: 'sub-1',
    license: {
      id: 'license-1',
      vpnAccess: {
        id: 'vpn-1',
        active: true,
        devices: [
          { id: 'device-1', active: true },
          { id: 'device-2', active: true },
        ],
      },
    },
  };
}

describe('Entitlement Revocation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription());

    prismaMock.license.update.mockResolvedValue({
      id: 'license-1',
      status: 'inactive',
    });

    prismaMock.vPNAccess.update.mockResolvedValue({
      id: 'vpn-1',
      active: false,
    });

    prismaMock.device.updateMany.mockResolvedValue({
      count: 2,
    });
  });

  it('revokes license, VPN access, and devices atomically', async () => {
    const result = await revokeEntitlement('sub-1');

    expect(result).toEqual({
      subscriptionId: 'sub-1',
      revoked: true,
    });

    expect(prismaMock.license.update).toHaveBeenCalledWith({
      where: {
        id: 'license-1',
      },
      data: {
        status: 'inactive',
      },
    });

    expect(prismaMock.vPNAccess.update).toHaveBeenCalledWith({
      where: {
        id: 'vpn-1',
      },
      data: {
        active: false,
      },
    });

    expect(prismaMock.device.updateMany).toHaveBeenCalledWith({
      where: {
        vpnAccessId: 'vpn-1',
      },
      data: {
        active: false,
      },
    });
  });

  it('does not require VPN access to revoke a license', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      license: {
        id: 'license-1',
        vpnAccess: null,
      },
    });

    await revokeEntitlement('sub-1');

    expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.vPNAccess.update).not.toHaveBeenCalled();
    expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
  });

  it('fails when subscription does not exist', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    await expect(revokeEntitlement('missing-sub')).rejects.toThrow('Subscription not found');

    expect(prismaMock.license.update).not.toHaveBeenCalled();
  });

  it('uses the supplied transaction client', async () => {
    await revokeEntitlementInTransaction('sub-1', prismaMock);

    expect(prismaMock.subscription.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
  });

  it('does not touch VPN/device when there is no license', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      license: null,
    });

    const result = await revokeEntitlement('sub-1');

    expect(result.revoked).toBe(true);
    expect(prismaMock.license.update).not.toHaveBeenCalled();
    expect(prismaMock.vPNAccess.update).not.toHaveBeenCalled();
    expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
  });
});
