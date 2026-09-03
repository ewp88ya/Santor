import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findVPNAccessOwnership: vi.fn(),
  findVPNAccessByLicense: vi.fn(),
  findActiveVPNNode: vi.fn(),
  createVPNAccess: vi.fn(),
}));

vi.mock('../vpn-access.repository.js', () => repositoryMock);

import { generateOwnedVPNAccess } from '../vpn-access.service.js';

describe('Phase 12 — VPN ownership security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects VPN access provisioning for another user license', async () => {
    repositoryMock.findVPNAccessOwnership.mockResolvedValue({
      id: 'license-1',
      subscription: {
        userId: 'owner-1',
        product: { code: 'WG-1M' },
      },
    });

    await expect(generateOwnedVPNAccess('license-1', 'attacker-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'License not found',
    });

    expect(repositoryMock.findVPNAccessByLicense).not.toHaveBeenCalled();
    expect(repositoryMock.findActiveVPNNode).not.toHaveBeenCalled();
    expect(repositoryMock.createVPNAccess).not.toHaveBeenCalled();
  });

  it('allows the VPN access owner to continue provisioning', async () => {
    repositoryMock.findVPNAccessOwnership.mockResolvedValue({
      id: 'license-1',
      subscription: {
        userId: 'owner-1',
        product: { code: 'WG-1M' },
      },
    });
    repositoryMock.findVPNAccessByLicense.mockResolvedValue({
      id: 'vpn-access-1',
      active: true,
      license: { id: 'license-1' },
      vpnNode: { id: 'node-1' },
    });

    await expect(generateOwnedVPNAccess('license-1', 'owner-1')).resolves.toMatchObject({
      id: 'vpn-access-1',
      active: true,
    });

    expect(repositoryMock.findVPNAccessByLicense).toHaveBeenCalled();
  });

  it('does not reveal whether another user license exists', async () => {
    repositoryMock.findVPNAccessOwnership.mockResolvedValue(null);

    await expect(generateOwnedVPNAccess('unknown-license', 'attacker-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'License not found',
    });

    expect(repositoryMock.findVPNAccessByLicense).not.toHaveBeenCalled();
  });
});
