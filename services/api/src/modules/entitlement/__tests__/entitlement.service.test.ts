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

function buildSubscription(
  productCode: string,
  status: string = 'pending',
  startDate: Date | null = null,
  endDate: Date | null = null,
) {
  return {
    id: 'sub-1',
    status,
    startDate,
    endDate,
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

function buildUpdatedSubscription(
  productCode: string,
  startDate: Date = new Date('2026-08-21T00:00:00.000Z'),
  endDate: Date = new Date('2026-09-20T00:00:00.000Z'),
) {
  return {
    id: 'sub-1',
    status: 'active',
    startDate,
    endDate,
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

  describe('activation', () => {
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

    it('preserves an existing active subscription period', async () => {
      const startDate = new Date('2026-08-01T00:00:00.000Z');
      const endDate = new Date('2026-10-01T00:00:00.000Z');

      prismaMock.subscription.findUnique.mockResolvedValue(
        buildSubscription('GENERAL-FREE', 'active', startDate, endDate),
      );

      prismaMock.subscription.update.mockResolvedValue(
        buildUpdatedSubscription('GENERAL-FREE', startDate, endDate),
      );

      await activateEntitlement('sub-1');

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'sub-1',
          },
          data: {
            status: 'active',
            startDate,
            endDate,
          },
        }),
      );
    });

    it('does not extend an already active entitlement when activated again', async () => {
      const startDate = new Date('2026-08-01T00:00:00.000Z');
      const endDate = new Date('2026-10-01T00:00:00.000Z');

      const existing = buildSubscription('WG-1M', 'active', startDate, endDate);

      prismaMock.subscription.findUnique.mockResolvedValue(existing);

      prismaMock.subscription.update.mockResolvedValue(
        buildUpdatedSubscription('WG-1M', startDate, endDate),
      );

      await activateEntitlement('sub-1');

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'active',
            startDate,
            endDate,
          },
        }),
      );

      expect(generateVPNAccessMock).toHaveBeenCalledTimes(1);
    });

    it('creates the subscription end date from start date for a pending subscription', async () => {
      const startDate = new Date('2026-08-21T00:00:00.000Z');
      const expectedEndDate = new Date('2026-09-20T00:00:00.000Z');

      prismaMock.subscription.findUnique.mockResolvedValue(
        buildSubscription('GENERAL-FREE', 'pending', startDate, null),
      );

      prismaMock.subscription.update.mockResolvedValue(
        buildUpdatedSubscription('GENERAL-FREE', startDate, expectedEndDate),
      );

      await activateEntitlement('sub-1');

      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'active',
            startDate,
            endDate: expectedEndDate,
          },
        }),
      );
    });
  });

  describe('validation', () => {
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
  });

  describe('transaction safety', () => {
    it('uses the transaction client for WireGuard provisioning', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('WG-1M'));

      prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('WG-1M'));

      await activateEntitlement('sub-1');

      expect(generateVPNAccessMock).toHaveBeenCalledTimes(1);

      const [licenseId, transactionClient] = generateVPNAccessMock.mock.calls[0];

      expect(licenseId).toBe('license-1');
      expect(transactionClient).toBe(prismaMock);
    });

    it('updates the license to active during entitlement activation', async () => {
      await activateEntitlement('sub-1');

      expect(prismaMock.license.update).toHaveBeenCalledWith({
        where: {
          id: 'license-1',
        },
        data: {
          status: 'active',
        },
      });
    });

    it('does not update the license when subscription validation fails', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      await expect(activateEntitlement('sub-1')).rejects.toThrow('Subscription not found');

      expect(prismaMock.license.update).not.toHaveBeenCalled();
    });

    it('does not provision VPN access when license activation fails', async () => {
      prismaMock.license.update.mockRejectedValue(new Error('LICENSE_UPDATE_FAILED'));

      prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('WG-1M'));

      prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('WG-1M'));

      await expect(activateEntitlement('sub-1')).rejects.toThrow('LICENSE_UPDATE_FAILED');

      expect(generateVPNAccessMock).not.toHaveBeenCalled();
    });

    it('propagates VPN provisioning failure through the transaction', async () => {
      const provisioningError = new Error('VPN_PROVISIONING_FAILED');

      prismaMock.subscription.findUnique.mockResolvedValue(buildSubscription('WG-1M'));

      prismaMock.subscription.update.mockResolvedValue(buildUpdatedSubscription('WG-1M'));

      generateVPNAccessMock.mockRejectedValue(provisioningError);

      await expect(activateEntitlement('sub-1')).rejects.toThrow('VPN_PROVISIONING_FAILED');

      expect(prismaMock.subscription.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
      expect(generateVPNAccessMock).toHaveBeenCalledWith('license-1', prismaMock);
    });

    it('uses Serializable isolation for the entitlement transaction', async () => {
      await activateEntitlement('sub-1');

      expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });
    });
  });
});
