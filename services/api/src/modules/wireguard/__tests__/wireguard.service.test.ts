import { beforeEach, describe, expect, it, vi } from 'vitest';
import { x25519 } from '@noble/curves/ed25519.js';

const {
  prismaMock,
  createWireGuardPeerMock,
  findPeerByDeviceMock,
  updateWireGuardPeerMock,
  provisionWireGuardPeerMock,
  revokeProvisionedWireGuardPeerMock,
} = vi.hoisted(() => ({
  prismaMock: {
    device: {
      findUnique: vi.fn(),
    },
    wireGuardPeer: {
      findUnique: vi.fn(),
    },
  },

  createWireGuardPeerMock: vi.fn(),
  findPeerByDeviceMock: vi.fn(),
  updateWireGuardPeerMock: vi.fn(),
  provisionWireGuardPeerMock: vi.fn(),
  revokeProvisionedWireGuardPeerMock: vi.fn(),
}));

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../wireguard.repository.js', () => ({
  createWireGuardPeer: createWireGuardPeerMock,
  findPeerByDevice: findPeerByDeviceMock,
  updateWireGuardPeer: updateWireGuardPeerMock,
}));

vi.mock('../../vpn-provisioning/vpn-provisioning.client.js', () => ({
  provisionWireGuardPeer: provisionWireGuardPeerMock,
  revokeWireGuardPeer: revokeProvisionedWireGuardPeerMock,
}));

function buildNode(overrides = {}) {
  return {
    id: 'node-1',
    active: true,
    provisioningUrl: 'https://vpn-node.example',
    provisioningKey: 'test-key',
    publicKey: 'server-public-key',
    hostname: 'vpn.example',
    port: 51820,
    ...overrides,
  };
}

function buildDevice(overrides = {}) {
  return {
    id: 'device-1',
    active: true,
    vpnAccess: {
      vpnNode: buildNode(),
      ...overrides,
    },
  };
}

function buildPeer(overrides = {}) {
  return {
    id: 'peer-1',
    deviceId: 'device-1',
    privateKey: 'private-key',
    publicKey: 'public-key',
    address: '10.0.0.10/32',
    endpoint: 'vpn.example:51820',
    ...overrides,
  };
}

describe('WireGuard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findPeerByDeviceMock.mockResolvedValue(null);

    prismaMock.device.findUnique.mockResolvedValue(buildDevice());

    prismaMock.wireGuardPeer.findUnique.mockResolvedValue(
      buildPeer({
        device: {
          vpnAccess: {
            vpnNode: buildNode(),
            license: {
              subscription: {
                userId: 'user-1',
              },
            },
          },
        },
      }),
    );

    provisionWireGuardPeerMock.mockResolvedValue({
      success: true,
      publicKey: 'public-key',
      endpoint: 'vpn.example:51820',
    });

    revokeProvisionedWireGuardPeerMock.mockResolvedValue(undefined);

    createWireGuardPeerMock.mockResolvedValue(buildPeer());

    updateWireGuardPeerMock.mockResolvedValue(buildPeer());
  });

  describe('generateWireGuardPeer', () => {
    it('reuses an existing peer', async () => {
      const existing = buildPeer();

      findPeerByDeviceMock.mockResolvedValue(existing);

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      const result = await generateWireGuardPeer('device-1');

      expect(result).toBe(existing);
      expect(prismaMock.device.findUnique).not.toHaveBeenCalled();
      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
      expect(createWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when the device does not exist', async () => {
      prismaMock.device.findUnique.mockResolvedValue(null);

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('missing-device')).rejects.toThrow('Device not found');

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
      expect(createWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when VPN access does not exist', async () => {
      prismaMock.device.findUnique.mockResolvedValue({
        id: 'device-1',
        vpnAccess: null,
      });

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('device-1')).rejects.toThrow('VPN Access not found');

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when VPN node is missing', async () => {
      prismaMock.device.findUnique.mockResolvedValue({
        id: 'device-1',
        vpnAccess: {
          vpnNode: null,
        },
      });

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('device-1')).rejects.toThrow('VPN node not configured');

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when VPN node is inactive', async () => {
      prismaMock.device.findUnique.mockResolvedValue(
        buildDevice({
          vpnNode: buildNode({
            active: false,
          }),
        }),
      );

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('device-1')).rejects.toThrow('VPN node is inactive');

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when provisioning is not configured', async () => {
      prismaMock.device.findUnique.mockResolvedValue(
        buildDevice({
          vpnNode: buildNode({
            provisioningUrl: null,
          }),
        }),
      );

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('device-1')).rejects.toThrow(
        'VPN node provisioning is not configured',
      );

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when provisioning key is missing', async () => {
      prismaMock.device.findUnique.mockResolvedValue(
        buildDevice({
          vpnNode: buildNode({
            provisioningKey: null,
          }),
        }),
      );

      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      await expect(generateWireGuardPeer('device-1')).rejects.toThrow(
        'VPN node provisioning key is not configured',
      );

      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('provisions and stores a new WireGuard peer', async () => {
      const { generateWireGuardPeer } = await import('../wireguard.service.js');

      const result = await generateWireGuardPeer('device-1');

      expect(provisionWireGuardPeerMock).toHaveBeenCalledTimes(1);

      const provisioningCall = provisionWireGuardPeerMock.mock.calls[0];

      expect(provisioningCall[0]).toBe('https://vpn-node.example');
      expect(provisioningCall[1]).toBe('test-key');

      expect(provisioningCall[2]).toMatchObject({
        publicKey: expect.any(String),
        address: expect.stringMatching(/^10\.0\.0\.\d+\/32$/),
      });

      expect(createWireGuardPeerMock).toHaveBeenCalledTimes(1);

      expect(createWireGuardPeerMock).toHaveBeenCalledWith({
        deviceId: 'device-1',
        privateKey: expect.any(String),
        publicKey: expect.any(String),
        address: expect.stringMatching(/^10\.0\.0\.\d+\/32$/),
        endpoint: 'vpn.example:51820',
      });

      expect(result).toEqual(buildPeer());
    });
  });

  describe('revokeWireGuardPeer', () => {
    it('returns null when no peer exists', async () => {
      findPeerByDeviceMock.mockResolvedValue(null);

      const { revokeWireGuardPeer } = await import('../wireguard.service.js');

      const result = await revokeWireGuardPeer('device-1');

      expect(result).toBeNull();
      expect(prismaMock.device.findUnique).not.toHaveBeenCalled();
      expect(revokeProvisionedWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('revokes the provisioned peer', async () => {
      const peer = buildPeer();

      findPeerByDeviceMock.mockResolvedValue(peer);

      const { revokeWireGuardPeer } = await import('../wireguard.service.js');

      const result = await revokeWireGuardPeer('device-1');

      expect(revokeProvisionedWireGuardPeerMock).toHaveBeenCalledWith(
        'https://vpn-node.example',
        'test-key',
        'public-key',
      );

      expect(result).toBe(peer);
    });
  });

  describe('regenerateWireGuardConfig', () => {
    it('rejects when the peer does not exist', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(null);

      const { regenerateWireGuardConfig } = await import('../wireguard.service.js');

      await expect(regenerateWireGuardConfig('user-1', 'device-1')).rejects.toThrow(
        'WireGuard peer not found',
      );

      expect(revokeProvisionedWireGuardPeerMock).not.toHaveBeenCalled();
      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('rejects when the subscription belongs to another user', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(
        buildPeer({
          device: {
            vpnAccess: {
              vpnNode: buildNode(),
              license: {
                subscription: {
                  userId: 'user-2',
                },
              },
            },
          },
        }),
      );

      const { regenerateWireGuardConfig } = await import('../wireguard.service.js');

      await expect(regenerateWireGuardConfig('user-1', 'device-1')).rejects.toThrow('Forbidden');

      expect(revokeProvisionedWireGuardPeerMock).not.toHaveBeenCalled();
      expect(provisionWireGuardPeerMock).not.toHaveBeenCalled();
    });

    it('revokes the old peer and provisions a new peer', async () => {
      const { regenerateWireGuardConfig } = await import('../wireguard.service.js');

      const result = await regenerateWireGuardConfig('user-1', 'device-1');

      expect(revokeProvisionedWireGuardPeerMock).toHaveBeenCalledWith(
        'https://vpn-node.example',
        'test-key',
        'public-key',
      );

      expect(provisionWireGuardPeerMock).toHaveBeenCalledTimes(1);

      expect(updateWireGuardPeerMock).toHaveBeenCalledWith('peer-1', {
        privateKey: expect.any(String),
        publicKey: expect.any(String),
        address: expect.stringMatching(/^10\.0\.0\.\d+\/32$/),
        endpoint: 'vpn.example:51820',
      });

      expect(result).toEqual(buildPeer());
    });
  });

  describe('getWireGuardConfig', () => {
    it('rejects when the peer does not exist', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(null);

      const { getWireGuardConfig } = await import('../wireguard.service.js');

      await expect(getWireGuardConfig('user-1', 'device-1')).rejects.toThrow(
        'WireGuard peer not found',
      );
    });

    it('rejects when the subscription belongs to another user', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(
        buildPeer({
          device: {
            vpnAccess: {
              vpnNode: buildNode(),
              license: {
                subscription: {
                  userId: 'user-2',
                },
              },
            },
          },
        }),
      );

      const { getWireGuardConfig } = await import('../wireguard.service.js');

      await expect(getWireGuardConfig('user-1', 'device-1')).rejects.toThrow('Forbidden');
    });

    it('rejects when the node is inactive', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(
        buildPeer({
          device: {
            vpnAccess: {
              vpnNode: buildNode({
                active: false,
              }),
              license: {
                subscription: {
                  userId: 'user-1',
                },
              },
            },
          },
        }),
      );

      const { getWireGuardConfig } = await import('../wireguard.service.js');

      await expect(getWireGuardConfig('user-1', 'device-1')).rejects.toThrow(
        'VPN node is inactive',
      );
    });

    it('rejects when the node public key is missing', async () => {
      prismaMock.wireGuardPeer.findUnique.mockResolvedValue(
        buildPeer({
          device: {
            vpnAccess: {
              vpnNode: buildNode({
                publicKey: null,
              }),
              license: {
                subscription: {
                  userId: 'user-1',
                },
              },
            },
          },
        }),
      );

      const { getWireGuardConfig } = await import('../wireguard.service.js');

      await expect(getWireGuardConfig('user-1', 'device-1')).rejects.toThrow(
        'VPN node public key is not configured',
      );
    });

    it('generates a valid WireGuard client configuration', async () => {
      const { getWireGuardConfig } = await import('../wireguard.service.js');

      const result = await getWireGuardConfig('user-1', 'device-1');

      expect(result).toContain('[Interface]');
      expect(result).toContain('PrivateKey = private-key');
      expect(result).toContain('Address = 10.0.0.10/32');
      expect(result).toContain('DNS = 1.1.1.1');
      expect(result).toContain('[Peer]');
      expect(result).toContain('PublicKey = server-public-key');
      expect(result).toContain('Endpoint = vpn.example:51820');
      expect(result).toContain('AllowedIPs = 0.0.0.0/0');
      expect(result).toContain('PersistentKeepalive = 25');
    });
  });
});
