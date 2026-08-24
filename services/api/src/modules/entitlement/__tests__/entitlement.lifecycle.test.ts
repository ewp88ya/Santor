import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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
    async (
      callback: (tx: typeof prismaMock) => Promise<unknown>,
    ) => callback(prismaMock),
  );

  return { prismaMock };
});

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

import { revokeEntitlement } from '../entitlement.revocation.service.js';
import { expireSubscriptions } from '../../subscription/subscription.expire.service.js';
import { cancelSubscription } from '../../subscription/subscription.repository.js';

function buildSubscription(status = 'active') {
  return {
    id: 'sub-1',
    status,
    license: {
      id: 'license-1',
      status: 'active',
      vpnAccess: {
        id: 'vpn-1',
        active: true,
        devices: [
          {
            id: 'device-1',
            active: true,
          },
        ],
      },
    },
  };
}

describe('Entitlement Lifecycle Revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prismaMock) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    prismaMock.subscription.findUnique.mockResolvedValue(
      buildSubscription(),
    );

    prismaMock.subscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        status: 'active',
        endDate: new Date('2026-08-20T00:00:00.000Z'),
        autoDebitEnabled: false,
        gracePeriodEnd: null,
      },
    ]);

    prismaMock.subscription.update.mockResolvedValue({
      id: 'sub-1',
      status: 'cancelled',
      license: {
        id: 'license-1',
      },
    });

    prismaMock.license.update.mockResolvedValue({
      id: 'license-1',
      status: 'inactive',
    });

    prismaMock.vPNAccess.update.mockResolvedValue({
      id: 'vpn-1',
      active: false,
    });

    prismaMock.device.updateMany.mockResolvedValue({
      count: 1,
    });
  });

  describe('revocation core', () => {
    it('revokes license, VPN access, and all devices atomically', async () => {
      const result = await revokeEntitlement('sub-1');

      expect(result).toEqual({
        subscriptionId: 'sub-1',
        revoked: true,
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

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

    it('does not require VPN access for general entitlement', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        license: {
          id: 'license-1',
          status: 'active',
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

      await expect(
        revokeEntitlement('missing-sub'),
      ).rejects.toThrow('Subscription not found');

      expect(prismaMock.license.update).not.toHaveBeenCalled();
      expect(prismaMock.vPNAccess.update).not.toHaveBeenCalled();
      expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('expiration lifecycle', () => {
    it('expires subscription and revokes entitlement in the same transaction', async () => {
      const result = await expireSubscriptions();

      expect(result).toBe(1);

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
        },
        data: {
          status: 'expired',
        },
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

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('does not expire an active subscription still inside grace period', async () => {
      prismaMock.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          status: 'active',
          endDate: new Date('2026-08-20T00:00:00.000Z'),
          autoDebitEnabled: true,
          gracePeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await expireSubscriptions();

      expect(result).toBe(0);
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
      expect(prismaMock.license.update).not.toHaveBeenCalled();
    });

    it('does not expire auto-debit subscription without grace-period decision', async () => {
      prismaMock.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          status: 'active',
          endDate: new Date('2026-08-20T00:00:00.000Z'),
          autoDebitEnabled: true,
          gracePeriodEnd: null,
        },
      ]);

      const result = await expireSubscriptions();

      expect(result).toBe(0);
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
      expect(prismaMock.license.update).not.toHaveBeenCalled();
    });
  });

  describe('cancellation lifecycle', () => {
    it('cancels subscription and revokes entitlement atomically', async () => {
      const result = await cancelSubscription('sub-1');

      expect(result.status).toBe('cancelled');

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
        },
        data: {
          status: 'cancelled',
        },
        include: {
          license: true,
        },
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

    it('rolls back cancellation when entitlement revocation fails', async () => {
      prismaMock.license.update.mockRejectedValue(
        new Error('LICENSE_REVOCATION_FAILED'),
      );

      await expect(
        cancelSubscription('sub-1'),
      ).rejects.toThrow('LICENSE_REVOCATION_FAILED');

      expect(prismaMock.subscription.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.vPNAccess.update).not.toHaveBeenCalled();
      expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('atomic rollback', () => {
    it('propagates VPN revocation failure through transaction', async () => {
      prismaMock.vPNAccess.update.mockRejectedValue(
        new Error('VPN_REVOCATION_FAILED'),
      );

      await expect(
        revokeEntitlement('sub-1'),
      ).rejects.toThrow('VPN_REVOCATION_FAILED');

      expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.vPNAccess.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
    });

    it('propagates device revocation failure through transaction', async () => {
      prismaMock.device.updateMany.mockRejectedValue(
        new Error('DEVICE_REVOCATION_FAILED'),
      );

      await expect(
        revokeEntitlement('sub-1'),
      ).rejects.toThrow('DEVICE_REVOCATION_FAILED');

      expect(prismaMock.license.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.vPNAccess.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.device.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
