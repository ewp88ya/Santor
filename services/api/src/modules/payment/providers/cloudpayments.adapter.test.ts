import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv };
});

async function createAdapter() {
  const { CloudPaymentsAdapter } = await import('./cloudpayments.adapter.js');
  return new CloudPaymentsAdapter();
}

function enableCloudPayments() {
  process.env.RUSSIA_PAYMENT_ENABLED = 'true';
  process.env.CLOUDPAYMENTS_PUBLIC_ID = 'public-id';
  process.env.CLOUDPAYMENTS_API_SECRET = 'secret';
  process.env.CLOUDPAYMENTS_BASE_URL = 'https://api.cloudpayments.test';
}

describe('CloudPaymentsAdapter', () => {
  it('rejects when Russia provider is disabled', async () => {
    process.env.RUSSIA_PAYMENT_ENABLED = 'false';

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 100,
      currency: 'RUB',
      referenceId: 'ref-disabled',
      paymentMethod: 'SBP',
    });

    expect(result).toEqual({
      success: false,
      error: 'Russia payment provider is disabled',
    });
  });

  it('creates an SBP payment and returns transaction ID + QR URL', async () => {
    enableCloudPayments();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Success: true,
            Model: {
              TransactionId: 123456,
              QrUrl: 'https://pay.example/qr/123456',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 500,
      currency: 'RUB',
      referenceId: 'ref-sbp-1',
      customerId: 'customer-1',
      paymentMethod: 'SBP',
    });

    expect(result).toEqual({
      success: true,
      providerPaymentId: '123456',
      transactionId: '123456',
      settlementCurrency: 'RUB',
      actions: [
        {
          type: 'redirect',
          value: 'https://pay.example/qr/123456',
        },
      ],
    });
  });

  it('retries transient HTTP failures with the same request ID', async () => {
    enableCloudPayments();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Success: false, Message: 'temporary failure' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Success: true,
            Model: {
              TransactionId: 456789,
              QrUrl: 'https://pay.example/qr/456789',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 500,
      currency: 'RUB',
      referenceId: 'ref-retry-1',
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;

    const firstHeaders = firstRequest.headers as Record<string, string>;
    const secondHeaders = secondRequest.headers as Record<string, string>;

    expect(firstHeaders['X-Request-ID']).toBeTruthy();
    expect(secondHeaders['X-Request-ID']).toBe(firstHeaders['X-Request-ID']);
  });

  it('does not retry non-transient HTTP errors', async () => {
    enableCloudPayments();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Success: false,
          Message: 'Invalid Amount',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 500,
      currency: 'RUB',
      referenceId: 'ref-no-retry-1',
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid Amount');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a MIR payment', async () => {
    enableCloudPayments();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Success: true,
            Model: {
              TransactionId: 987654,
              QrUrl: 'https://pay.example/mir/987654',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 700,
      currency: 'RUB',
      referenceId: 'ref-mir-1',
      customerId: 'customer-2',
      paymentMethod: 'MIR',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('987654');
    expect(result.transactionId).toBe('987654');
  });

  it('verifies a successful transaction', async () => {
    enableCloudPayments();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Success: true,
            Model: {
              TransactionId: 123456,
              Amount: 500,
              Currency: 'RUB',
              InvoiceId: 'ref-sbp-1',
              Status: 'Completed',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    const adapter = await createAdapter();

    const result = await adapter.verifyPayment('123456');

    expect(result).toEqual({
      status: 'success',
      providerPaymentId: '123456',
      transactionId: '123456',
      referenceId: 'ref-sbp-1',
      amount: 500,
      currency: 'RUB',
      error: undefined,
    });
  });

  it('maps failed transaction status', async () => {
    enableCloudPayments();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Success: true,
            Model: {
              TransactionId: 123456,
              Amount: 500,
              Currency: 'RUB',
              InvoiceId: 'ref-failed-1',
              Status: 'Declined',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    const adapter = await createAdapter();

    const result = await adapter.verifyPayment('123456');

    expect(result.status).toBe('failed');
  });

  it('rejects non-RUB payments', async () => {
    enableCloudPayments();

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 500,
      currency: 'USD',
      referenceId: 'ref-usd-1',
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('requires RUB');
  });

  it('rejects unsupported payment methods', async () => {
    enableCloudPayments();

    const adapter = await createAdapter();

    const result = await adapter.charge({
      amount: 500,
      currency: 'RUB',
      referenceId: 'ref-card-1',
      paymentMethod: 'VISA',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported');
  });
});
