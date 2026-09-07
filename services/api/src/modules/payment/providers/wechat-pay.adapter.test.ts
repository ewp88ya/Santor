import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.WECHAT_PAY_ENABLED = 'true';
  process.env.WECHAT_PAY_APP_ID = 'wx-test';
  process.env.WECHAT_PAY_MCH_ID = 'mch-test';
  process.env.WECHAT_PAY_API_V3_KEY = '12345678901234567890123456789012';
  process.env.WECHAT_PAY_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDsQaPK8POJcPgc\nTUNCXyXnsemeegkoAmg/gaXl+5CcXUcd0CejU2XXsmIOfywFTZHJQ9awy6YqtjME\nwQ+06FQ9Ez2HlSSIjAcq6pDFywNe47sKJaFGe1Ro615QQUJDSbEp39/54ArZKmkh\ncRvyZWrTz/BKPM/TcnRX2AfNvZqegJfRN17E+BfpeKsE6MUeC57w0bmtCIzQYg6x\nZG4MpXGxj36w5R4NKMwPb22XxtjRD9Q6qgxe/ouxwzV1gn2lFF1RGXwbuy23OWV7\nVwWXegBqodJtnw4mTdIBvuWdDi1h02bBHeAluybdGRGJ4Flu7ylHU2nXi/GiriXg\nv9DfhbHbAgMBAAECggEAHDVmKigE3Ac6CJ8NBdK4guaSP1LQ3w8ShWqkdUZJKPJW\nOHAPG4gso8lvvc1fYy601nQcITXfnD/u7YVjq7UFwdkXQqYDG66keHJTYNpxh5Xn\nUjnV/MVi+bgIpcp07/XPinFpm7stcGqI7O5FaPbE/49XYHXMVrHWxFpN7DnUSVJU\njerzlOYKHC87CLDdB/FtAMjw2qCiJyVkkqHy4qavlbLVYTb1+sQhdcSWUoGFCgQE\nlqICNMHi4Pj/0LHs2dKsG0eFM2YNs6RCrnsoMId8gsIBuUN5K8qdK/mPy2XFyY5X\nOmpBbZ3nTLjZiwBB66ogzHsiEJ8DkUD5e+5VTVeImQKBgQD85E4HdpsfE3Kz5dGo\n/FHrD3pYu3e0duxtS9BNkfVwglP/+UbY1fCzPvoSSp930U7HQyHA+JK9bD+MsyT9\nkGIbJOdrBvEtheNUcgcnDmYmY8Uo+L7lFf0TM/U+ubOC2n1+2RzJa7qnx9QlDLKe\npOkfAt2m3Vm1OPhZDHs+IC/o7wKBgQDvKP5cYcakrxz9cCm79DxWiRvp1wzYOc47\n0FhvwyquPN0FUWjJroRnsMFSfPum4tP0QGsxP/CAf5AcGNna+YuN7lDywonImLp\nyTowh/nPBr8zvJ1XP+QZDA3ngLsKV5EHtsBZgN6bETUla0opgGEKNvu/QXsnK/U+\njUfnEPdN1QKBgQCY+w8Myr3p3ZzsoKDlBcYUWSec18MBI1PAhjU7R4lfBygDV+t4\nrmrOM9GZERVIqRBrz/tyPaye9AW5eoFs9lOyse9gOjHZZP3xDo2vHbHDlWUmdNsd\nv+B5Jlw8FqA2DzANdQ9J9WZTqrl1tCm1eHMhdF1bXNmwnAb372n6WgRBdwKBgQCA\n+ZuLGJO21lUM/EMVgJZVmKV8CyR7K1lj+mznANpwkpPU6m/el5D61aKYpJQvVqTf\ni3iawram2spR2ApTiOXegOChhcrY5ftv1rxR1dLLafkNHqe/mM4bD9wjv9GetzCY\nd17uJchm2fXOUzjwfrJWfuZu8xJGQreEX06qdwTXbQKBgQD29pH+KHJrbGCWk9X3\nBeiJbrDc+DS8WbKQsbHIw4EY3NFxbmpY03bj9f5QndSiQ7/8xekgOYO/zxP/H96S\nUuAA5/qvX1ZEpqiZwzzumeyDqG++tF1ROy6PghWVpCaySAbVEkAzOyIj3a0u4ENx\ngOafMKu4sr42Ur/5KuoZ4Th1eg==\n-----END PRIVATE KEY-----`;
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
