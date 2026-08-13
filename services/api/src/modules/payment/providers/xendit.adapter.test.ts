process.env.XENDIT_ENABLED = 'true';
process.env.XENDIT_API_KEY = 'test-api-key';
process.env.XENDIT_BASE_URL = 'https://api.xendit.co';

import { afterEach, describe, expect, it, vi } from 'vitest';

const originalFetch = globalThis.fetch;

async function getXenditAdapter() {
  const { XenditAdapter } = await import('./xendit.adapter.js');

  return XenditAdapter;
}

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('XenditAdapter', () => {
  it('creates a payment successfully', async () => {
    mockFetch({
      payment_request_id: 'pr-123',
      latest_payment_id: 'pay-123',
      reference_id: 'payment-123',
      status: 'ACCEPTING_PAYMENTS',
      actions: [
        {
          type: 'REDIRECT_CUSTOMER',
          descriptor: 'WEB',
          value: 'https://example.com/pay',
        },
      ],
    });

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.charge({
      referenceId: 'payment-123',
      amount: 100000,
      currency: 'IDR',
      country: 'ID',
      paymentMethod: 'QRIS',
    });

    expect(result.success).toBe(true);
    expect(result.providerPaymentId).toBe('pr-123');
    expect(result.transactionId).toBe('pay-123');
    expect(result.settlementCurrency).toBe('IDR');
    expect(result.actions).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid payment amount', async () => {
    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.charge({
      referenceId: 'payment-invalid',
      amount: 0,
      currency: 'IDR',
      country: 'ID',
      paymentMethod: 'QRIS',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Payment amount must be greater than zero');
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it('verifies a successful payment', async () => {
    mockFetch({
      payment_request_id: 'pr-123',
      latest_payment_id: 'pay-123',
      reference_id: 'payment-123',
      status: 'SUCCEEDED',
      request_amount: 100000,
      currency: 'IDR',
    });

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.verifyPayment('pr-123');

    expect(result.status).toBe('success');
    expect(result.providerPaymentId).toBe('pr-123');
    expect(result.transactionId).toBe('pay-123');
  });

  it('keeps an accepting payment pending', async () => {
    mockFetch({
      payment_request_id: 'pr-456',
      latest_payment_id: 'pay-456',
      reference_id: 'payment-456',
      status: 'ACCEPTING_PAYMENTS',
    });

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.verifyPayment('pr-456');

    expect(result.status).toBe('pending');
    expect(result.providerPaymentId).toBe('pr-456');
    expect(result.transactionId).toBe('pay-456');
  });

  it('maps a failed provider payment correctly', async () => {
    mockFetch({
      payment_request_id: 'pr-789',
      latest_payment_id: 'pay-789',
      reference_id: 'payment-789',
      status: 'FAILED',
    });

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.verifyPayment('pr-789');

    expect(result.status).toBe('failed');
    expect(result.providerPaymentId).toBe('pr-789');
    expect(result.transactionId).toBe('pay-789');
  });

  it('returns unknown when Xendit returns an HTTP error', async () => {
    mockFetch(
      {
        error_code: 'API_ERROR',
        message: 'Payment request not found',
      },
      404,
    );

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.verifyPayment('missing-payment');

    expect(result.status).toBe('unknown');
    expect(result.error).toBe('Payment request not found');
  });

  it('returns unknown when the verification request fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network unavailable'));

    const XenditAdapter = await getXenditAdapter();
    const adapter = new XenditAdapter();

    const result = await adapter.verifyPayment('pr-network-error');

    expect(result.status).toBe('unknown');
    expect(result.error).toContain('Xendit verification request failed');
    expect(result.error).toContain('network unavailable');
  });
});
