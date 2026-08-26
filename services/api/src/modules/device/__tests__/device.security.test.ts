import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findDeviceByIdMock,
  revokeDeviceMock,
  auditLogMock,
  revokeWireGuardPeerMock,
  regenerateWireGuardConfigMock,
  prismaFindUniqueMock,
  countActiveDevicesMock,
  createDeviceMock,
  generateWireGuardPeerMock,
} = vi.hoisted(() => ({
  findDeviceByIdMock: vi.fn(),
  revokeDeviceMock: vi.fn(),
  auditLogMock: vi.fn(),
  revokeWireGuardPeerMock: vi.fn(),
  regenerateWireGuardConfigMock: vi.fn(),
  prismaFindUniqueMock: vi.fn(),
  countActiveDevicesMock: vi.fn(),
  createDeviceMock: vi.fn(),
  generateWireGuardPeerMock: vi.fn(),
}));

vi.mock('../device.repository.js', () => ({
  findDeviceById: findDeviceByIdMock,
  revokeDevice: revokeDeviceMock,
  countActiveDevices: countActiveDevicesMock,
  createDevice: createDeviceMock,
  listDevices: vi.fn(),
}));

vi.mock('../../../config/database.js', () => ({
  prisma: {
    vPNAccess: {
      findUnique: prismaFindUniqueMock,
    },
    device: {
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../wireguard/wireguard.service.js', () => ({
  generateWireGuardPeer: generateWireGuardPeerMock,
  regenerateWireGuardConfig: regenerateWireGuardConfigMock,
  revokeWireGuardPeer: revokeWireGuardPeerMock,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

import { addDevice, disableDevice, getDevice, regenerateDeviceConfig } from '../device.service.js';

function buildDevice(ownerId = 'user-owner-1', active = true) {
  return {
    id: 'device-1',
    vpnAccessId: 'vpn-access-1',
    active,
    vpnAccess: {
      active: true,
      license: {
        subscription: {
          userId: ownerId,
          status: 'active',
          product: {
            code: 'WG-1M',
            deviceLimit: 3,
          },
        },
      },
      vpnNode: {
        id: 'node-1',
        active: true,
        protocol: 'wireguard',
      },
    },
  };
}

function buildVPNAccess(ownerId = 'user-owner-1') {
  return {
    id: 'vpn-access-1',
    active: true,
    vpnNodeId: 'node-1',
    vpnNode: {
      id: 'node-1',
      active: true,
      protocol: 'wireguard',
    },
    license: {
      subscription: {
        userId: ownerId,
        status: 'active',
        product: {
          code: 'WG-1M',
          deviceLimit: 3,
        },
      },
    },
  };
}

describe('Device Security — Ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDeviceByIdMock.mockResolvedValue(buildDevice());
    revokeDeviceMock.mockResolvedValue({ id: 'device-1', active: false });
    auditLogMock.mockResolvedValue(undefined);
    revokeWireGuardPeerMock.mockResolvedValue(undefined);
    regenerateWireGuardConfigMock.mockResolvedValue({ config: 'wg-config' });
    prismaFindUniqueMock.mockResolvedValue(buildVPNAccess());
    countActiveDevicesMock.mockResolvedValue(0);
    createDeviceMock.mockResolvedValue({ id: 'device-1' });
    generateWireGuardPeerMock.mockResolvedValue(undefined);
  });

  it('rejects another user from reading a device', async () => {
    await expect(getDevice('user-attacker-1', 'device-1')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });

    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 'user-attacker-1',
      action: 'ACCESS_DENIED',
      resource: 'DEVICE',
      resourceId: 'device-1',
      metadata: { reason: 'OWNERSHIP_MISMATCH' },
    });
  });

  it('rejects another user from disabling a device', async () => {
    await expect(disableDevice('user-attacker-1', 'device-1')).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(revokeWireGuardPeerMock).not.toHaveBeenCalled();
    expect(revokeDeviceMock).not.toHaveBeenCalled();
  });

  it('rejects another user from regenerating a device config', async () => {
    await expect(
      regenerateDeviceConfig('user-attacker-1', 'device-1'),
    ).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(regenerateWireGuardConfigMock).not.toHaveBeenCalled();
  });

  it('rejects another user from adding a device to a VPN access', async () => {
    await expect(addDevice('user-attacker-1', 'vpn-access-1', 'attacker-device')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });

    expect(countActiveDevicesMock).not.toHaveBeenCalled();
    expect(createDeviceMock).not.toHaveBeenCalled();
    expect(generateWireGuardPeerMock).not.toHaveBeenCalled();
  });

  it('allows the owner to disable an active device', async () => {
    const result = await disableDevice('user-owner-1', 'device-1');

    expect(result).toEqual({ id: 'device-1', active: false });
    expect(revokeWireGuardPeerMock).toHaveBeenCalledWith('device-1');
    expect(revokeDeviceMock).toHaveBeenCalledWith('device-1');
  });
});
