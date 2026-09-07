import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.WECHAT_PAY_ENABLED = 'true';
  process.env.WECHAT_PAY_APP_ID = 'wx-test';
  process.env.WECHAT_PAY_MCH_ID = 'mch-test';
  process.env.WECHAT_PAY_API_V3_KEY = '12345678901234567890123456789012';
  process.env.WECHAT_PAY_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDbB0x7RoQqWn1V\n2V2ARb1+tR/C8lwC/ph9vf7LpXW9MMXl7Kl9gguAQW2ZIBkU4+GaaUyymP2mQT20\ny/QJkOwLxbTOZx9ANJaQ3u+xMlg6IpD7vkjDD+u6xToJQwbMMjo6MZs6cgIjKOWi\nCLs+rFXdbUgG+B0cdH/8JtaDd1ED98WVdfEuVEFSGHIsRqkUX2SwzXMXxbXlwLR/\ndCjii0U2WfY+yc7bLmJAMpW51A9QLDleT0RCP3yf1TjlZQzDotU3sTM/t+8KZZaH\nda195RNGtz3sG2pSYRAo7PpZO+X+LzBFnmpoTaZOfd3j8DFDuxY/TJb9BnGM9BPm\ngCkogViBAgMBAAECggEABw+6R2n6F9pFmskNV49013Fw3gDUHTEAUWMY14/BkIE4\n8bukD6ZSLZpIAmODbrKvUtWc24MzZkx8xOfwbO1UFuF5MOn1NKvQkOIguZNFPraS\nx9li9vSVjB0Qszy+EUMRsOk2UN32s+B9KspIrL5/1DA4qsGnQQQZt9NR7JIiHAd6\nx6HNiVEVihhAuS+JCYT8nYuQjyBcMC1p/mCr4hmOulhAByJ2oihn+sZT+eW2C78L\njo+ZouV8pPTW1d0LIoxKO/JOUEV0K5F6XB8jrcbPwsWQZBGX8mhdTlGZCaYPusx1\nqzDEjwgzz29tm6jzUCH8rqxE/Ta8QiZSQFEzR8LoawKBgQD16AhlxCoVO6wiG3V+\nSKi0ujSs3BEBCvB+GAbiNeWLGRBrtlfQEXGWXhacQvS2lQ4D+Unj9iHg0xbKas9d\nc5rAP4tcLP+EgaF+VJX6jEXJTQ2XsODloQGubc9MCvVTlHo5lVHJ97uKKj6Oanas\nM60OdO5goZ2Uqn82SoWXhqTNjwKBgQDkBNXOmIfGJU1zc7aYCh7YRP1yMogeHUs3\n2Mnxwanti/hUoWrjE3iRAGYCbVnMXAthPepk4Krv9vhlToJS1PQnNjByToRcTq0C\nklYVuVtAuHmvufPFVPMyJzocQ/DXZPiG08VL7iiGiki1DpFUwhBUpb8+BDUbP2nN\nuHH8JiuQ7wKBgAtoF/ugfdM+UV3DqE+TT0AS4x6hlqhVuZIfyzHzDhLFtt1IOAqO\nxJYVBzd4Y6GUiHHmvma0pB2prQT2r2fGVQdV60D7VV7wJG2Xvt1AZHxR9q9ypPwB\n2/IbZeJBH+AgowrIwmJ7+1cNXpl8lsSmIQDqq6QP2x9qSTxbeJbux/ZBAoGAUqHF\n8dao7Y+7H6nBdBvGzc1Co83YMkGfbp+rn2b1c9aTqefNWnlF6hZg4WRLdJmurhDI\nDsK0b73qipwG8oml6UfkCqiVovYIELSDaeAAR9YSkzIqO0rrzzMUBgZBE23N+t5n\n03p9STR34NVkqXiifmqKgaj4reUvLJQ5Co2yoBUCgYBV9hAHLidQQi5CCwwxkTSR\nKhXcyAqMQ8aA4Wb1P34dzl8zZ+AqflCz6rDeV0eWDdFs0TcAa6tzluW1nfHic/fO\nSW6fiDsGbk3t2aMqMepBlQwN192WVdx7SJFNX1Dtl21poXprZYmryJXnEHLOpGJy\nTFEfF9+QEPUy17eOqEaxCg==\n-----END PRIVATE KEY-----`;
  process.env.WECHAT_PAY_SERIAL_NUMBER = 'serial-test';
  process.env.WECHAT_PAY_BASE_URL = 'https://wechat.test';
  process.env.WECHAT_PAY_NOTIFY_URL = 'https://santor.test/wechat/webhook';
});

import { WeChatPayAdapter } from './wechat-pay.adapter.js';

describe('WeChatPayAdapter', () => {
  it('creates a native payment and exposes the QR action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ prepay_id: 'prepay-1', code_url: 'weixin://wxpay/bizpayurl' }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
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
      vi.fn(
        async () =>
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
