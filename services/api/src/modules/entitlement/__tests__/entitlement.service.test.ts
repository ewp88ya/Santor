import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, generateVPNAccessMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    license: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
  );

  return {
    prismaMock,
    generateVPNAccessMock: vi.fn(),
  };
});

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../vpn-access/vpn-access.service.js', () => ({
  generateVPNAccess: generateVPNAccessMock,
}));

import { activateEntitlement } from '../entitlement.service.js';

function buildSubscription(productCode: string, status: string = 'pending') {
  return {
    id: 'sub-1',
    status,
    startDate: null,
    endDate: null,
    product: {
      code: productCode,
      durationDays: 30,
    },
    license: {
      id: 'license-1',
      status: 'pending',
      vpnAccess: null,
    },
  };
}

function buildUpdatedSubscription(productCode: string) {
  return {
    id: 'sub-1',
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    product: {
      code: productCode,
      durationDays: 30,
    },
    user: {
      id: 'user-1',
    },
    license: {
      id: 'license-1',
      status: 'pending',
      vpnAccess: {
        devices: [],
      },
    },
  };
}

describe('Entitlement Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
    );

    prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('GENERAL-FREE'));

    prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('GENERAL-FREE'));

    prismaMock.license.update.mockResolvedValue({
      id: 'license-1',
      status: 'active',
    });

    generateVPNAccessMock.mockResolvedValue({
      id: 'vpn-access-1',
      protocol: 'wireguard',
    });
  });

  it('activates a General entitlement without creating VPN access', async () => {
    const result = await activateEntitlement('sub-1');

    expect(result.mode).toBe('general');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.license.update).toHaveBeenCalledTimes(1);

    expect(generateVPNAccessMock).not.toHaveBeenCalled();
  });

  it('activates a WireGuard entitlement and provisions VPN access inside the transaction', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('WG-1M'));

    prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('WG-1M'));

    const result = await activateEntitlement('sub-1');

    expect(result.mode).toBe('wireguard');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.license.update).toHaveBeenCalledTimes(1);

    expect(generateVPNAccessMock).toHaveBeenCalledWith('license-1', prismaMock);

    if (result.mode !== 'wireguard') {
      throw new Error('Expected WireGuard entitlement result');
    }

    expect(result.vpnAccess).toEqual({
      id: 'vpn-access-1',
      protocol: 'wireguard',
    });
  });

  it('rejects activation when the subscription does not exist', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    await expect(activateEntitlement('missing-sub')).rejects.toThrow('Subscription not found');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(prismaMock.license.update).not.toHaveBeenCalled();
    expect(generateVPNAccessMock).not.toHaveBeenCalled();
  });

  it('rejects activation of a cancelled subscription', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(
      buildSubscription('GENERAL-FREE', 'cancelled'),
    );

    await expect(activateEntitlement('sub-1')).rejects.toThrow(
      'Cancelled subscription cannot be activated',
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(prismaMock.license.update).not.toHaveBeenCalled();
    expect(generateVPNAccessMock).not.toHaveBeenCalled();
  });

  it('rejects activation when the subscription has no license', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      ...buildSubscription('GENERAL-FREE'),
      license: null,
    });

    await expect(activateEntitlement('sub-1')).rejects.toThrow(
      'Cannot activate entitlement without license',
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(prismaMock.license.update).not.toHaveBeenCalled();
    expect(generateVPNAccessMock).not.toHaveBeenCalled();
  });

  it('uses the transaction client for WireGuard provisioning', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('WG-1M'));

    prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('WG-1M'));

    await activateEntitlement('sub-1');

    expect(generateVPNAccessMock).toHaveBeenCalledTimes(1);

    const [licenseId, transactionClient] = generateVPNAccessMock.mock.calls[0];

    expect(licenseId).toBe('license-1');
    expect(transactionClient).toBe(prismaMock);
  });
});
