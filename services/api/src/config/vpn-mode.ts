import createError from 'http-errors';

export type VPNMode = 'general' | 'wireguard';

export function getVPNMode(productCode: string): VPNMode {
  if (productCode === 'GENERAL-FREE') {
    return 'general';
  }

  if (productCode.startsWith('GENERAL-PRO')) {
    return 'general';
  }

  if (productCode.startsWith('WG-')) {
    return 'wireguard';
  }

  throw createError(
    400,
    `Unsupported VPN product mode: ${productCode}`,
  );
}
