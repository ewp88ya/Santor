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
    paypal: createProvider('paypal'),
    xendit: createProvider('xendit'),
    russia: createProvider('russia'),
  };

  it('routes VISA to the global card provider', () => {
    expect(routePaymentProvider('ID', 'VISA', providers)).toBe(providers.globalCard);
  });

  it('routes MASTERCARD to the global card provider', () => {
    expect(routePaymentProvider('ID', 'MASTERCARD', providers)).toBe(providers.globalCard);
  });

  it('routes PAYPAL to the standalone PayPal provider', () => {
    expect(routePaymentProvider('ID', 'PAYPAL', providers)).toBe(providers.paypal);
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

  it('routes Russia CRYPTO to the Russia provider', () => {
    expect(routePaymentProvider('RU', 'CRYPTO', providers)).toBe(providers.russia);
  });

  it('routes Indonesia IDR QRIS to Xendit', () => {
    expect(routePaymentProvider('ID', 'QRIS', providers, 'IDR')).toBe(providers.xendit);
  });

  it('routes Malaysia MYR to Xendit', () => {
    expect(routePaymentProvider('MY', 'QRIS', providers, 'MYR')).toBe(providers.xendit);
  });

  it('routes Thailand THB to Xendit', () => {
    expect(routePaymentProvider('TH', 'QRIS', providers, 'THB')).toBe(providers.xendit);
  });

  it('routes Philippines PHP to Xendit', () => {
    expect(routePaymentProvider('PH', 'QRIS', providers, 'PHP')).toBe(providers.xendit);
  });

  it('routes Vietnam VND to Xendit', () => {
    expect(routePaymentProvider('VN', 'QRIS', providers, 'VND')).toBe(providers.xendit);
  });

  it('routes Singapore SGD to Xendit', () => {
    expect(routePaymentProvider('SG', 'QRIS', providers, 'SGD')).toBe(providers.xendit);
  });

  it('routes Laos LAK to Xendit', () => {
    expect(routePaymentProvider('LA', 'QRIS', providers, 'LAK')).toBe(providers.xendit);
  });

  it('routes Cambodia KHR to Xendit', () => {
    expect(routePaymentProvider('KH', 'QRIS', providers, 'KHR')).toBe(providers.xendit);
  });

  it('uses Xendit as the default provider', () => {
    expect(routePaymentProvider('ID', 'QRIS', providers)).toBe(providers.xendit);
  });

  it('normalizes lowercase country codes', () => {
    expect(routePaymentProvider('ru', 'SBP', providers)).toBe(providers.russia);
  });
});
