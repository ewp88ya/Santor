import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  createVPNAccessMock,
  findVPNAccessByLicenseMock,
  findVPNAccessOwnershipMock,
  findActiveVPNNodeMock,
  getVPNModeMock,
} = vi.hoisted(() => ({
  prismaMock: {
    vPNAccess: {
      update: vi.fn(),
    },
  },

  createVPNAccessMock: vi.fn(),
  findVPNAccessByLicenseMock: vi.fn(),
  findVPNAccessOwnershipMock: vi.fn(),
  findActiveVPNNodeMock: vi.fn(),
  getVPNModeMock: vi.fn(),
}));

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../vpn-access.repository.js', () => ({
  createVPNAccess: createVPNAccessMock,
  findVPNAccessByLicense: findVPNAccessByLicenseMock,
  findVPNAccessOwnership: findVPNAccessOwnershipMock,
  findActiveVPNNode: findActiveVPNNodeMock,
}));

vi.mock('../../../config/vpn-mode.js', () => ({
  getVPNMode: getVPNModeMock,
}));

import { generateOwnedVPNAccess, generateVPNAccess } from '../vpn-access.service.js';

function buildOwnership(userId = 'user-1', productCode = 'WG-1M') {
  return {
    id: 'license-1',
    subscription: {
      userId,
      product: {
        code: productCode,
      },
    },
  };
}

function buildVPNAccess(active = true) {
  return {
    id: 'vpn-access-1',
    licenseId: 'license-1',
    protocol: 'wireguard',
    active,
    vpnNode: {
      id: 'node-1',
      active: true,
      protocol: 'wireguard',
    },
  };
}

function buildVPNNode() {
  return {
    id: 'node-1',
    active: true,
    protocol: 'wireguard',
  };
}

describe('VPN Access Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getVPNModeMock.mockReturnValue('wireguard');

    findVPNAccessOwnershipMock.mockResolvedValue(buildOwnership());

    findVPNAccessByLicenseMock.mockResolvedValue(null);

    findActiveVPNNodeMock.mockResolvedValue(buildVPNNode());

    createVPNAccessMock.mockResolvedValue(buildVPNAccess(true));

    prismaMock.vPNAccess.update.mockResolvedValue(buildVPNAccess(true));
  });

  describe('generateVPNAccess', () => {
    it('rejects when the license does not exist', async () => {
      findVPNAccessOwnershipMock.mockResolvedValue(null);

      await expect(generateVPNAccess('missing-license')).rejects.toThrow('License not found');

      expect(findVPNAccessByLicenseMock).not.toHaveBeenCalled();

      expect(findActiveVPNNodeMock).not.toHaveBeenCalled();

      expect(createVPNAccessMock).not.toHaveBeenCalled();
    });

    it('rejects non-WireGuard products', async () => {
      findVPNAccessOwnershipMock.mockResolvedValue(buildOwnership('user-1', 'GENERAL-PRO'));

      getVPNModeMock.mockReturnValue('general');

      await expect(generateVPNAccess('license-1')).rejects.toThrow(
        'VPN access provisioning is not supported for general mode',
      );

      expect(findVPNAccessByLicenseMock).not.toHaveBeenCalled();

      expect(findActiveVPNNodeMock).not.toHaveBeenCalled();

      expect(createVPNAccessMock).not.toHaveBeenCalled();
    });

    it('reactivates an existing inactive VPN access', async () => {
      const existing = buildVPNAccess(false);

      findVPNAccessByLicenseMock.mockResolvedValue(existing);

      await generateVPNAccess('license-1');

      expect(prismaMock.vPNAccess.update).toHaveBeenCalledWith({
        where: {
          id: 'vpn-access-1',
        },
        data: {
          active: true,
        },
        include: {
          license: true,
          vpnNode: true,
        },
      });

      expect(createVPNAccessMock).not.toHaveBeenCalled();

      expect(findActiveVPNNodeMock).not.toHaveBeenCalled();
    });

    it('reuses an existing active VPN access', async () => {
      const existing = buildVPNAccess(true);

      findVPNAccessByLicenseMock.mockResolvedValue(existing);

      const result = await generateVPNAccess('license-1');

      expect(result).toBe(existing);

      expect(prismaMock.vPNAccess.update).not.toHaveBeenCalled();

      expect(createVPNAccessMock).not.toHaveBeenCalled();

      expect(findActiveVPNNodeMock).not.toHaveBeenCalled();
    });

    it('rejects when no active WireGuard VPN node is available', async () => {
      findActiveVPNNodeMock.mockResolvedValue(null);

      await expect(generateVPNAccess('license-1')).rejects.toThrow('No active VPN node available');

      expect(createVPNAccessMock).not.toHaveBeenCalled();
    });

    it('creates and activates a new WireGuard VPN access', async () => {
      const created = buildVPNAccess(true);

      createVPNAccessMock.mockResolvedValue(created);

      const result = await generateVPNAccess('license-1');

      expect(findActiveVPNNodeMock).toHaveBeenCalledTimes(1);

      expect(createVPNAccessMock).toHaveBeenCalledWith(
        {
          licenseId: 'license-1',
          protocol: 'wireguard',
          vpnNodeId: 'node-1',
        },
        prismaMock,
      );

      expect(prismaMock.vPNAccess.update).toHaveBeenCalledWith({
        where: {
          id: 'vpn-access-1',
        },
        data: {
          active: true,
        },
        include: {
          license: true,
          vpnNode: true,
        },
      });

      expect(result).toEqual(created);
    });

    it('passes the transaction client through the repository layer', async () => {
      const transactionClient = {
        vPNAccess: {
          update: vi.fn(),
        },
      };

      const existing = buildVPNAccess(true);

      findVPNAccessByLicenseMock.mockResolvedValue(existing);

      await generateVPNAccess('license-1', transactionClient);

      expect(findVPNAccessByLicenseMock).toHaveBeenCalledWith('license-1', transactionClient);
    });
  });

  describe('generateOwnedVPNAccess', () => {
    it('rejects when the license does not exist', async () => {
      findVPNAccessOwnershipMock.mockResolvedValue(null);

      await expect(generateOwnedVPNAccess('missing-license', 'user-1')).rejects.toThrow(
        'License not found',
      );

      expect(createVPNAccessMock).not.toHaveBeenCalled();
    });

    it('rejects when the license belongs to another user', async () => {
      findVPNAccessOwnershipMock.mockResolvedValue(buildOwnership('user-2'));

      await expect(generateOwnedVPNAccess('license-1', 'user-1')).rejects.toThrow(
        'License not found',
      );

      expect(findVPNAccessByLicenseMock).not.toHaveBeenCalled();

      expect(createVPNAccessMock).not.toHaveBeenCalled();
    });

    it('generates VPN access for the license owner', async () => {
      const existing = buildVPNAccess(true);

      findVPNAccessOwnershipMock.mockResolvedValue(buildOwnership('user-1'));

      findVPNAccessByLicenseMock.mockResolvedValue(existing);

      const result = await generateOwnedVPNAccess('license-1', 'user-1');

      expect(result).toBe(existing);

      expect(findVPNAccessOwnershipMock).toHaveBeenCalledWith('license-1');

      expect(findVPNAccessByLicenseMock).toHaveBeenCalledWith('license-1', prismaMock);
    });
  });
});
