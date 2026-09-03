import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  getUserDashboard: vi.fn(),
}));

vi.mock('../dashboard.repository.js', () => repositoryMock);

import { getDashboard } from '../dashboard.service.js';

describe('Phase 12 — dashboard integration contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing dashboard user', async () => {
    repositoryMock.getUserDashboard.mockResolvedValue(null);

    await expect(getDashboard('missing-user')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    expect(repositoryMock.getUserDashboard).toHaveBeenCalledWith('missing-user');
  });

  it('returns active subscription and VPN/device dashboard data', async () => {
    const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    repositoryMock.getUserDashboard.mockResolvedValue({
      id: 'user-1',
      name: 'User',
      email: 'user@example.com',
      status: 'active',
      emailVerified: true,
      subscriptions: [
        {
          id: 'subscription-1',
          status: 'active',
          startDate: new Date(),
          endDate,
          product: {
            id: 'product-1',
            name: 'WG 1 Month',
            code: 'WG-1M',
            price: 10,
            currency: 'USD',
            durationDays: 30,
            deviceLimit: 3,
          },
          license: {
            id: 'license-1',
            licenseKey: 'LICENSE-1',
            status: 'active',
            vpnAccess: {
              id: 'vpn-access-1',
              protocol: 'wireguard',
              active: true,
              vpnNode: {
                hostname: 'vpn.example.com',
              },
              devices: [
                {
                  id: 'device-1',
                  name: 'Laptop',
                  active: true,
                  publicKey: 'public-key-1',
                },
              ],
            },
          },
        },
      ],
    });

    const result = await getDashboard('user-1');

    expect(result.user).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
    });

    expect(result.subscription).toMatchObject({
      id: 'subscription-1',
      status: 'active',
      product: {
        code: 'WG-1M',
      },
    });

    expect(result.subscription?.license?.vpnAccess).toMatchObject({
      protocol: 'wireguard',
      serverNode: 'vpn.example.com',
      active: true,
    });

    expect(result.subscription?.license?.vpnAccess?.devices).toEqual([
      expect.objectContaining({
        id: 'device-1',
        name: 'Laptop',
        active: true,
        downloadUrl: '/api/v1/wireguard/config/device-1',
      }),
    ]);

    expect(result.upgrade.available).toBe(false);
  });

  it('marks expired subscriptions and enables upgrade', async () => {
    repositoryMock.getUserDashboard.mockResolvedValue({
      id: 'user-2',
      name: null,
      email: 'expired@example.com',
      status: 'active',
      emailVerified: true,
      subscriptions: [
        {
          id: 'subscription-2',
          status: 'active',
          startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          product: {
            id: 'product-2',
            name: 'WG 1 Month',
            code: 'WG-1M',
            price: 10,
            currency: 'USD',
            durationDays: 30,
            deviceLimit: 3,
          },
          license: null,
        },
      ],
    });

    const result = await getDashboard('user-2');

    expect(result.subscription).toBeNull();
    expect(result.subscriptions[0]).toMatchObject({
      id: 'subscription-2',
      status: 'expired',
      lifecycle: {
        expired: true,
        remainingDays: 0,
        canUpgrade: true,
        upgradeUrl: '/pricing',
      },
    });
    expect(result.upgrade).toEqual({
      available: true,
      url: '/pricing',
    });
  });
});
