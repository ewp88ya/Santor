import { randomUUID } from "node:crypto";

import {
  createLicense,
  findLicenseById,
  findLicenseBySubscription,
  listLicenses,
} from "./license.repository.js";

export async function generateLicense(
  subscriptionId: string,
) {
  const existing = await findLicenseBySubscription(
    subscriptionId,
  );

  if (existing) {
    return existing;
  }

  const licenseKey = `SANTOR-${randomUUID().replaceAll("-", "").toUpperCase()}`;

  return createLicense(
    subscriptionId,
    licenseKey,
  );
}

export async function getLicense(id: string) {
  return findLicenseById(id);
}

export async function getLicenses() {
  return listLicenses();
}

export async function getLicenseBySubscription(
  subscriptionId: string,
) {
  return findLicenseBySubscription(
    subscriptionId,
  );
}
