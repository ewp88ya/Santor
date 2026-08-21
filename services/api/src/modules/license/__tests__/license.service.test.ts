import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createLicenseMock, findLicenseByIdMock, findLicenseBySubscriptionMock, listLicensesMock } =
  vi.hoisted(() => ({
    createLicenseMock: vi.fn(),
    findLicenseByIdMock: vi.fn(),
    findLicenseBySubscriptionMock: vi.fn(),
    listLicensesMock: vi.fn(),
  }));

vi.mock('../license.repository.js', () => ({
  createLicense: createLicenseMock,
  findLicenseById: findLicenseByIdMock,
  findLicenseBySubscription: findLicenseBySubscriptionMock,
  listLicenses: listLicensesMock,
}));

import {
  generateLicense,
  getLicense,
  getLicenseBySubscription,
  getLicenses,
} from '../license.service.js';

function buildLicense() {
  return {
    id: 'license-1',
    subscriptionId: 'sub-1',
    licenseKey: 'SANTOR-ABC123',
    status: 'inactive',
    subscription: {
      id: 'sub-1',
      userId: 'user-1',
      productId: 'product-1',
      user: {
        id: 'user-1',
      },
      product: {
        id: 'product-1',
        code: 'WG-1M',
      },
    },
  };
}

function buildPrismaUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`subscriptionId`)',
    {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: {
        target: ['subscriptionId'],
      },
    },
  );
}

describe('License Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findLicenseBySubscriptionMock.mockResolvedValue(null);
    createLicenseMock.mockResolvedValue(buildLicense());
    findLicenseByIdMock.mockResolvedValue(buildLicense());
    listLicensesMock.mockResolvedValue([buildLicense()]);
  });

  describe('generateLicense', () => {
    it('returns an existing license without creating a duplicate', async () => {
      const existing = buildLicense();

      findLicenseBySubscriptionMock.mockResolvedValue(existing);

      const result = await generateLicense('sub-1');

      expect(result).toBe(existing);

      expect(findLicenseBySubscriptionMock).toHaveBeenCalledTimes(1);
      expect(findLicenseBySubscriptionMock).toHaveBeenCalledWith('sub-1');

      expect(createLicenseMock).not.toHaveBeenCalled();
    });

    it('creates a license when none exists', async () => {
      const created = buildLicense();

      createLicenseMock.mockResolvedValue(created);

      const result = await generateLicense('sub-1');

      expect(result).toBe(created);

      expect(findLicenseBySubscriptionMock).toHaveBeenCalledTimes(1);

      expect(createLicenseMock).toHaveBeenCalledTimes(1);

      expect(createLicenseMock).toHaveBeenCalledWith(
        'sub-1',
        expect.stringMatching(/^SANTOR-[A-Z0-9]+$/),
      );
    });

    it('generates a unique SANTOR license key', async () => {
      const created = buildLicense();

      createLicenseMock.mockResolvedValue(created);

      await generateLicense('sub-1');

      const [, licenseKey] = createLicenseMock.mock.calls[0];

      expect(licenseKey).toMatch(/^SANTOR-[A-Z0-9]+$/);
      expect(licenseKey).toHaveLength(39);
      expect(licenseKey.startsWith('SANTOR-')).toBe(true);
    });

    it('handles concurrent license generation without creating a duplicate license', async () => {
      const existing = buildLicense();

      let lookupCount = 0;

      findLicenseBySubscriptionMock.mockImplementation(async () => {
        lookupCount += 1;

        if (lookupCount <= 2) {
          return null;
        }

        return existing;
      });

      let createCount = 0;

      createLicenseMock.mockImplementation(async () => {
        createCount += 1;

        if (createCount === 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));

          return existing;
        }

        throw buildPrismaUniqueConstraintError();
      });

      const results = await Promise.all([generateLicense('sub-1'), generateLicense('sub-1')]);

      expect(results).toHaveLength(2);

      expect(results[0]).toEqual(existing);
      expect(results[1]).toEqual(existing);

      expect(createLicenseMock).toHaveBeenCalledTimes(2);
      expect(findLicenseBySubscriptionMock).toHaveBeenCalledTimes(3);
    });

    it('rethrows an unrelated Prisma error', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Database error', {
        code: 'P2003',
        clientVersion: '7.8.0',
      });

      createLicenseMock.mockRejectedValue(error);

      await expect(generateLicense('sub-1')).rejects.toBe(error);

      expect(findLicenseBySubscriptionMock).toHaveBeenCalledTimes(1);
      expect(createLicenseMock).toHaveBeenCalledTimes(1);
    });

    it('rethrows P2002 when the concurrent license cannot be found', async () => {
      const error = buildPrismaUniqueConstraintError();

      createLicenseMock.mockRejectedValue(error);

      findLicenseBySubscriptionMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await expect(generateLicense('sub-1')).rejects.toBe(error);

      expect(findLicenseBySubscriptionMock).toHaveBeenCalledTimes(2);
      expect(createLicenseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLicense', () => {
    it('returns a license by ID', async () => {
      const existing = buildLicense();

      findLicenseByIdMock.mockResolvedValue(existing);

      const result = await getLicense('license-1');

      expect(result).toBe(existing);

      expect(findLicenseByIdMock).toHaveBeenCalledWith('license-1');
    });
  });

  describe('getLicenses', () => {
    it('returns all licenses', async () => {
      const licenses = [buildLicense()];

      listLicensesMock.mockResolvedValue(licenses);

      const result = await getLicenses();

      expect(result).toBe(licenses);

      expect(listLicensesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLicenseBySubscription', () => {
    it('returns the license for a subscription', async () => {
      const existing = buildLicense();

      findLicenseBySubscriptionMock.mockResolvedValue(existing);

      const result = await getLicenseBySubscription('sub-1');

      expect(result).toBe(existing);

      expect(findLicenseBySubscriptionMock).toHaveBeenCalledWith('sub-1');
    });
  });
});
