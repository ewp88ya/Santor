import { describe, expect, it } from 'vitest';

import { getVPNMode } from './vpn-mode.js';

describe('getVPNMode', () => {
  it('maps GENERAL-FREE to general', () => {
    expect(getVPNMode('GENERAL-FREE')).toBe('general');
  });

  it('maps General Pro products to general', () => {
    expect(getVPNMode('GENERAL-PRO-1M')).toBe('general');
    expect(getVPNMode('GENERAL-PRO-6M')).toBe('general');
    expect(getVPNMode('GENERAL-PRO-12M')).toBe('general');
  });

  it('maps WireGuard products to wireguard', () => {
    expect(getVPNMode('WG-1M')).toBe('wireguard');
    expect(getVPNMode('WG-3M')).toBe('wireguard');
    expect(getVPNMode('WG-6M')).toBe('wireguard');
    expect(getVPNMode('WG-12M')).toBe('wireguard');
  });

  it('rejects unsupported product codes', () => {
    expect(() => getVPNMode('UNKNOWN')).toThrow('Unsupported VPN product mode: UNKNOWN');
  });

  it('does not treat GENERAL-PRO as WireGuard', () => {
    expect(getVPNMode('GENERAL-PRO')).toBe('general');
  });
});
