import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findDeviceByIdMock, provisionProxyUserMock, revokeProxyUserMock } = vi.hoisted(() => ({
  findDeviceByIdMock: vi.fn(),
  provisionProxyUserMock: vi.fn(),
  revokeProxyUserMock: vi.fn(),
}));

vi.mock('../../device/device.repository.js', () => ({
  findDeviceById: findDeviceByIdMock,
}));

vi.mock('../proxy.client.js', () => ({
  provisionProxyUser: provisionProxyUserMock,
  revokeProxyUser: revokeProxyUserMock,
}));

import { getProxyProfile } from '../proxy.service.js';

function buildDevice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'device-1',
    name: 'Android - Happ',
    active: true,
    vpnAccess: {
      active: true,
      protocol: 'vless',
      license: {
        status: 'active',
        subscription: {
          userId: 'user-1',
          status: 'active',
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    },
    ...overrides,
  };
}

describe('Proxy profile service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDeviceByIdMock.mockResolvedValue(buildDevice());
    provisionProxyUserMock.mockResolvedValue(undefined);
  });

  it('returns a VLESS profile only after the proxy provisioner confirms success', async () => {
    const result = await getProxyProfile('user-1', 'device-1');

    expect(provisionProxyUserMock).toHaveBeenCalledTimes(1);
    expect(provisionProxyUserMock).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      'santor-device-1@proxy',
    );
    expect(result.success).toBe(true);
    expect(result.profile).toMatch(/^vless:\/\/.+@api\.santor\.app:443\?/);
  });

  it('does not return a profile when provisioning fails', async () => {
    provisionProxyUserMock.mockRejectedValue(new Error('PROXY_PROVISIONING_FAILED'));

    await expect(getProxyProfile('user-1', 'device-1')).rejects.toThrow(
      'PROXY_PROVISIONING_FAILED',
    );
  });

  it('rejects an expired subscription before calling the provisioner', async () => {
    findDeviceByIdMock.mockResolvedValue(
      buildDevice({
        vpnAccess: {
          active: true,
          protocol: 'vless',
          license: {
            status: 'active',
            subscription: {
              userId: 'user-1',
              status: 'active',
              endDate: new Date(Date.now() - 1000),
            },
          },
        },
      }),
    );

    await expect(getProxyProfile('user-1', 'device-1')).rejects.toThrow(
      'Active subscription required',
    );
    expect(provisionProxyUserMock).not.toHaveBeenCalled();
  });

  it('does not provision a device owned by another account', async () => {
    findDeviceByIdMock.mockResolvedValue(
      buildDevice({
        vpnAccess: {
          active: true,
          protocol: 'vless',
          license: {
            status: 'active',
            subscription: {
              userId: 'user-2',
              status: 'active',
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        },
      }),
    );

    await expect(getProxyProfile('user-1', 'device-1')).rejects.toThrow('Device not found');
    expect(provisionProxyUserMock).not.toHaveBeenCalled();
  });
});