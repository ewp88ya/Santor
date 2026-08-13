import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RUSSIA_PAYMENT_ENABLED = 'true';
process.env.PLATEGA_MERCHANT_ID = 'test-merchant';
process.env.PLATEGA_SECRET = 'test-secret';
process.env.PLATEGA_BASE_URL = 'https://test.platega.local';

describe('PlategaAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates SBP payment using Platega method 2', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          transactionId: 'plt-sbp-001',
          redirect: 'https://pay.example/sbp',
        }),
        { status: 200 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const adapter = new PlategaAdapter();

    const result = await adapter.charge({
      amount: 1000,
      currency: 'RUB',
      country: 'RU',
      paymentMethod: 'SBP',
      referenceId: 'payment-001',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('plt-sbp-001');
    expect(result.transactionId).toBe('plt-sbp-001');
    expect(result.actions?.[0]?.type).toBe('redirect');

    const [, init] = fetchMock.mock.calls[0];

    expect(JSON.parse(String(init?.body))).toMatchObject({
      paymentMethod: 2,
      amount: 1000,
      currency: 'RUB',
      merchantTransactionId: 'payment-001',
    });
  });

  it('creates MIR payment using Platega Russian-card method 10', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          transactionId: 'plt-mir-001',
        }),
        { status: 200 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().charge({
      amount: 1500,
      currency: 'RUB',
      country: 'RU',
      paymentMethod: 'MIR',
      referenceId: 'payment-002',
    });

    expect(result.success).toBe(true);

    const [, init] = fetchMock.mock.calls[0];

    expect(JSON.parse(String(init?.body))).toMatchObject({
      paymentMethod: 10,
    });
  });

  it('creates crypto payment using Platega method 13', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          transactionId: 'plt-crypto-001',
          url: 'https://pay.example/crypto',
        }),
        { status: 200 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().charge({
      amount: 2000,
      currency: 'RUB',
      country: 'RU',
      paymentMethod: 'CRYPTO',
      referenceId: 'payment-003',
    });

    expect(result.success).toBe(true);

    const [, init] = fetchMock.mock.calls[0];

    expect(JSON.parse(String(init?.body))).toMatchObject({
      paymentMethod: 13,
    });
  });

  it('rejects unsupported payment methods', async () => {
    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().charge({
      amount: 1000,
      currency: 'RUB',
      country: 'RU',
      paymentMethod: 'VISA',
      referenceId: 'payment-004',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported Platega payment method');
  });

  it('verifies successful payment', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-verify-001',
          transactionId: 'plt-verify-001',
          status: 'CONFIRMED',
          amount: 1000,
          currency: 'RUB',
          merchantTransactionId: 'payment-005',
        }),
        { status: 200 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().verifyPayment('plt-verify-001');

    expect(result.status).toBe('success');
    expect(result.providerPaymentId).toBe('plt-verify-001');
    expect(result.transactionId).toBe('plt-verify-001');
    expect(result.referenceId).toBe('payment-005');
    expect(result.amount).toBe(1000);
    expect(result.currency).toBe('RUB');
  });

  it('returns failed status when Platega reports failed payment', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-failed-001',
          status: 'FAILED',
        }),
        { status: 200 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().verifyPayment('plt-failed-001');

    expect(result.status).toBe('failed');
  });

  it('handles Platega HTTP errors safely', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Invalid credentials',
        }),
        { status: 401 },
      ),
    );

    const { PlategaAdapter } = await import('./platega.adapter.js');

    const result = await new PlategaAdapter().verifyPayment('plt-error-001');

    expect(result.status).toBe('unknown');
    expect(result.error).toContain('Platega verification request failed');
  });
});
