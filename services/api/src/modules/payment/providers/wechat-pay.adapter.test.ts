import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.WECHAT_PAY_ENABLED = 'true';
  process.env.WECHAT_PAY_APP_ID = 'wx-test';
  process.env.WECHAT_PAY_MCH_ID = 'mch-test';
  process.env.WECHAT_PAY_API_V3_KEY = '12345678901234567890123456789012';
  process.env.WECHAT_PAY_PRIVATE_KEY = 'test-private-key';
  process.env.WECHAT_PAY_SERIAL_NUMBER = 'serial-test';
  process.env.WECHAT_PAY_BASE_URL = 'https://wechat.test';
  process.env.WECHAT_PAY_NOTIFY_URL = 'https://santor.test/wechat/webhook';
});

import { WeChatPayAdapter } from './wechat-pay.adapter.js';

describe('WeChatPayAdapter', () => {
  it('creates a native payment and exposes the QR action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ prepay_id: 'prepay-1', code_url: 'weixin://wxpay/bizpayurl' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const result = await new WeChatPayAdapter().charge({
      amount: 199,
      currency: 'CNY',
      paymentMethod: 'WECHAT_PAY',
      referenceId: 'payment-1',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('prepay-1');
    expect(result.actions?.[0]?.type).toBe('qr');
  });

  it('rejects non-CNY payments before making a provider request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await new WeChatPayAdapter().charge({
      amount: 199,
      currency: 'USD',
      paymentMethod: 'WECHAT_PAY',
      referenceId: 'payment-1',
    });

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain('CNY');
  });

  it('maps a successful order query to the common verification contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            transaction_id: 'wx-tx-1',
            out_trade_no: 'payment-1',
            trade_state: 'SUCCESS',
            amount: { total: 199, currency: 'CNY' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const result = await new WeChatPayAdapter().verifyPayment('prepay-1', {
      transactionId: 'payment-1',
    });

    expect(result.status).toBe('success');
    expect(result.transactionId).toBe('wx-tx-1');
    expect(result.referenceId).toBe('payment-1');
    expect(result.amount).toBe(199);
    expect(result.currency).toBe('CNY');
  });
});
