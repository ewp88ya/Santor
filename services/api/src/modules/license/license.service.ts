import { randomUUID } from 'node:crypto';

import {
  createLicense,
  findLicenseById,
  findLicenseBySubscription,
  listLicenses,
} from './license.repository.js';

import { generateVPNAccess } from '../vpn-access/vpn-access.service.js';

export async function generateLicense(subscriptionId: string) {
  const existing = await findLicenseBySubscription(subscriptionId);

  if (existing) {
    return existing;
  }

  const licenseKey = `SANTOR-${randomUUID().replaceAll('-', '').toUpperCase()}`;

  const license = await createLicense(subscriptionId, licenseKey);

  await generateVPNAccess(license.id);

  return license;
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
