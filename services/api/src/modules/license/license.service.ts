import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import {
  createLicense,
  findLicenseById,
  findLicenseBySubscription,
  listLicenses,
} from './license.repository.js';

export async function generateLicense(subscriptionId: string) {
  const existing = await findLicenseBySubscription(subscriptionId);

  if (existing) {
    return existing;
  }

  const licenseKey = `SANTOR-${randomUUID().replaceAll('-', '').toUpperCase()}`;

  try {
    return await createLicense(subscriptionId, licenseKey);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrentLicense = await findLicenseBySubscription(subscriptionId);

      if (concurrentLicense) {
        return concurrentLicense;
      }
    }

    throw error;
  }
}

export async function getLicense(id: string) {
  return findLicenseById(id);
}

export async function getLicenses() {
  return listLicenses();
}

export async function getLicenseBySubscription(subscriptionId: string) {
  return findLicenseBySubscription(subscriptionId);
}
