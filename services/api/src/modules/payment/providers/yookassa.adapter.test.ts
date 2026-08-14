import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RUSSIA_PAYMENT_ENABLED = 'true';
process.env.YOOKASSA_SHOP_ID = 'test-shop';
process.env.YOOKASSA_SECRET = 'test-secret';
process.env.YOOKASSA_BASE_URL = 'https://test.yookassa.local';
process.env.YOOKASSA_RETURN_URL = 'https://santor.test/payment/return';

describe('YooKassaAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a redirect payment with Basic Auth and Idempotence-Key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'yk-payment-001',
          status: 'pending',
          amount: {
            value: '1000.00',
            currency: 'RUB',
          },
          confirmation: {
            type: 'redirect',
            confirmation_url: 'https://yookassa.test/pay/001',
          },
        }),
        { status: 200 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().charge({
      amount: 1000,
      currency: 'RUB',
      country: 'RU',
      paymentMethod: 'MIR',
      referenceId: 'payment-001',
      customerId: 'customer-001',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('yk-payment-001');
    expect(result.transactionId).toBe('yk-payment-001');
    expect(result.actions?.[0]).toEqual({
      type: 'redirect',
      value: 'https://yookassa.test/pay/001',
    });

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://test.yookassa.local/v3/payments');
    expect(init?.method).toBe('POST');

    const headers = new Headers(init?.headers);

    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotence-Key')).toBe('payment-001');
    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from('test-shop:test-secret').toString('base64')}`,
    );

    expect(JSON.parse(String(init?.body))).toMatchObject({
      amount: {
        value: '1000.00',
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: 'https://santor.test/payment/return',
      },
      metadata: {
        reference_id: 'payment-001',
        customer_id: 'customer-001',
      },
    });
  });

  it('verifies a succeeded payment', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'yk-payment-002',
          status: 'succeeded',
          paid: true,
          amount: {
            value: '1500.00',
            currency: 'RUB',
          },
          metadata: {
            reference_id: 'payment-002',
          },
        }),
        { status: 200 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('yk-payment-002');

    expect(result.status).toBe('success');
    expect(result.providerPaymentId).toBe('yk-payment-002');
    expect(result.transactionId).toBe('yk-payment-002');
    expect(result.referenceId).toBe('payment-002');
    expect(result.amount).toBe(1500);
    expect(result.currency).toBe('RUB');

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://test.yookassa.local/v3/payments/yk-payment-002');
    expect(init?.method).toBe('GET');

    const headers = new Headers(init?.headers);

    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from('test-shop:test-secret').toString('base64')}`,
    );
  });

  it('maps pending to pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'yk-pending',
          status: 'pending',
        }),
        { status: 200 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('yk-pending');

    expect(result.status).toBe('pending');
  });

  it('maps waiting_for_capture to pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'yk-capture',
          status: 'waiting_for_capture',
        }),
        { status: 200 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('yk-capture');

    expect(result.status).toBe('pending');
  });

  it('maps canceled to failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'yk-canceled',
          status: 'canceled',
        }),
        { status: 200 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('yk-canceled');

    expect(result.status).toBe('failed');
  });

  it('handles HTTP errors safely', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'error',
          message: 'Invalid credentials',
        }),
        { status: 401 },
      ),
    );

    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('yk-error');

    expect(result.status).toBe('unknown');
    expect(result.error).toContain('YooKassa verification request failed');
  });

  it('rejects empty payment IDs', async () => {
    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const result = await new YooKassaAdapter().verifyPayment('   ');

    expect(result.status).toBe('unknown');
    expect(result.error).toBe('YooKassa payment ID is required');
  });

  it('rejects invalid payment amounts', async () => {
    const { YooKassaAdapter } = await import('./yookassa.adapter.js');

    const adapter = new YooKassaAdapter();

    const zero = await adapter.charge({
      amount: 0,
      currency: 'RUB',
      referenceId: 'payment-zero',
    });

    const negative = await adapter.charge({
      amount: -100,
      currency: 'RUB',
      referenceId: 'payment-negative',
    });

    expect(zero.success).toBe(false);
    expect(zero.error).toContain('amount must be greater than zero');

    expect(negative.success).toBe(false);
    expect(negative.error).toContain('amount must be greater than zero');
  });
});
