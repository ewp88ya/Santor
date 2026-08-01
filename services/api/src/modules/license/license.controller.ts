import {
  generateLicense,
  getLicense,
  getLicenses,
  getLicenseBySubscription,
} from "./license.service.js";

export async function createLicenseController(
  body: {
    subscriptionId: string;
  },
) {
  return generateLicense(
    body.subscriptionId,
  );
}

export async function listLicenseController() {
  return getLicenses();
}

export async function detailLicenseController(
  id: string,
) {
  return getLicense(id);
}

export async function subscriptionLicenseController(
  subscriptionId: string,
) {
  return getLicenseBySubscription(
    subscriptionId,
  );
}
