import { describe, expect, it } from 'vitest';

import { routePaymentProvider } from '../payment.router.js';
import type { PaymentProvider } from '../providers/payment.provider.js';

function createProvider(name: string): PaymentProvider {
  return {
    async charge() {
      return {
        success: true,
        providerPaymentId: name,
      };
    },

    async verifyPayment() {
      return {
        status: 'success',
        providerPaymentId: name,
      };
    },
  };
}

describe('routePaymentProvider', () => {
  const providers = {
    globalCard: createProvider('global-card'),
    xendit: createProvider('xendit'),
    russia: createProvider('russia'),
  };

  it('routes VISA to the global card provider', () => {
    expect(routePaymentProvider('ID', 'VISA', providers)).toBe(providers.globalCard);
  });

  it('routes MASTERCARD to the global card provider', () => {
    expect(routePaymentProvider('ID', 'MASTERCARD', providers)).toBe(providers.globalCard);
  });

  it('routes China Alipay to Xendit', () => {
    expect(routePaymentProvider('CN', 'ALIPAY', providers)).toBe(providers.xendit);
  });

  it('routes China WeChat Pay to Xendit', () => {
    expect(routePaymentProvider('CN', 'WECHAT_PAY', providers)).toBe(providers.xendit);
  });

  it('routes Russia SBP to the Russia provider', () => {
    expect(routePaymentProvider('RU', 'SBP', providers)).toBe(providers.russia);
  });

  it('routes Russia MIR to the Russia provider', () => {
    expect(routePaymentProvider('RU', 'MIR', providers)).toBe(providers.russia);
  });

  it('uses Xendit as the default provider', () => {
    expect(routePaymentProvider('ID', 'QRIS', providers)).toBe(providers.xendit);
  });

  it('normalizes lowercase country codes', () => {
    expect(routePaymentProvider('ru', 'SBP', providers)).toBe(providers.russia);
  });
});
