import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlipayAdapter } from './alipay.adapter.js';

beforeEach(() => {
  vi.stubEnv('ALIPAY_ENABLED', 'true');
  vi.stubEnv('ALIPAY_APP_ID', 'test-app');
  vi.stubEnv('ALIPAY_PRIVATE_KEY', 'test-private-key');
  vi.stubEnv('ALIPAY_PUBLIC_KEY', 'test-public-key');
  vi.stubEnv('ALIPAY_BASE_URL', 'https://alipay.test');
  vi.stubEnv('ALIPAY_RETURN_URL', 'https://santor.test/alipay/return');
  vi.stubEnv('ALIPAY_NOTIFY_URL', 'https://santor.test/alipay/webhook');
});

describe('AlipayAdapter', () => {
  it('creates a payment contract and exposes provider actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              result: {
                resultStatus: 'S',
                resultCode: 'SUCCESS',
                paymentId: 'ali-payment-1',
                paymentUrl: 'https://alipay.test/pay/1',
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const result = await new AlipayAdapter().charge({
      amount: 199,
      currency: 'USD',
      paymentMethod: 'ALIPAY',
      referenceId: 'payment-1',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('ali-payment-1');
    expect(result.actions?.[0]?.value).toBe('https://alipay.test/pay/1');
  });

  it('maps provider status to the common verification contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              result: {
                paymentStatus: 'SUCCESS',
                paymentId: 'ali-payment-1',
                referenceOrderId: 'payment-1',
                amount: { value: '1.99', currency: 'USD' },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const result = await new AlipayAdapter().verifyPayment('ali-payment-1', {
      transactionId: 'payment-1',
    });

    expect(result.status).toBe('success');
    expect(result.referenceId).toBe('payment-1');
    expect(result.amount).toBe(199);
    expect(result.currency).toBe('USD');
  });
});
