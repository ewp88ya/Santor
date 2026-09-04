import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./providers/payment.config.js', () => ({
  paymentConfig: {
    stripe: {
      enabled: true,
      stripeSecretKey: 'stripe-test-key',
      stripeBaseUrl: 'https://stripe.test',
    },
    paypal: {
      enabled: true,
      paypalClientId: 'paypal-client',
      paypalClientSecret: 'paypal-secret',
      paypalBaseUrl: 'https://paypal.test',
    },
    xendit: {
      enabled: true,
      apiKey: 'xendit-key',
      baseUrl: 'https://xendit.test',
    },
    russia: {
      enabled: true,
      yookassaShopId: 'shop-id',
      yookassaSecret: 'yookassa-secret',
      yookassaBaseUrl: 'https://yookassa.test',
      cloudPaymentsPublicId: 'cloud-public',
      cloudPaymentsApiSecret: 'cloud-secret',
      cloudPaymentsBaseUrl: 'https://cloudpayments.test',
    },
  },
}));

import { refundExternalPayment } from './payment.refund.provider.js';

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

const fetchMock = vi.fn();

describe('External Payment Refund Provider Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends Stripe refunds in minor currency units', async () => {
    fetchMock.mockResolvedValue(
      response({
        id: 're_stripe_1',
        status: 'succeeded',
      }),
    );

    const result = await refundExternalPayment({
      provider: 'GlobalCardAdapter',
      providerPaymentId: 'pi_123',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-1',
    });

    expect(result).toEqual({ status: 'succeeded', refundId: 're_stripe_1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toContain('amount=10000');
    expect(init.body).toContain('payment_intent=pi_123');
    expect(init.headers['Idempotency-Key']).toBe('refund-1');
  });

  it('preserves major units for PayPal refunds', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ access_token: 'paypal-token' }))
      .mockResolvedValueOnce(response({ id: 'paypal-refund-1', status: 'COMPLETED' }));

    const result = await refundExternalPayment({
      provider: 'PayPalAdapter',
      providerPaymentId: 'order-1',
      transactionId: 'capture-1',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-paypal-1',
    });

    expect(result).toEqual({ status: 'succeeded', refundId: 'paypal-refund-1' });

    const refundInit = fetchMock.mock.calls[1][1];
    expect(JSON.parse(refundInit.body)).toMatchObject({
      amount: {
        currency_code: 'USD',
        value: '100.00',
      },
    });
  });

  it('rejects a PayPal refund without a capture ID before any provider request', async () => {
    const result = await refundExternalPayment({
      provider: 'PayPalAdapter',
      providerPaymentId: 'order-1',
      amount: 1,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-paypal-missing-capture',
    });

    expect(result).toEqual({
      status: 'failed',
      error: 'PayPal capture ID is required for refund',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a PayPal pending refund to pending without treating it as success', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ access_token: 'paypal-token' }))
      .mockResolvedValueOnce(response({ id: 'paypal-refund-pending', status: 'PENDING' }));

    const result = await refundExternalPayment({
      provider: 'PayPalAdapter',
      providerPaymentId: 'order-1',
      transactionId: 'capture-pending',
      amount: 1,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-paypal-pending',
    });

    expect(result).toEqual({
      status: 'pending',
      refundId: 'paypal-refund-pending',
      error: 'PayPal refund is pending',
    });
  });

  it('maps PayPal provider errors to failed', async () => {
    fetchMock.mockResolvedValueOnce(response({ access_token: 'paypal-token' })).mockResolvedValueOnce(
      response(
        {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The capture has already been refunded.',
        },
        false,
        422,
      ),
    );

    const result = await refundExternalPayment({
      provider: 'PayPalAdapter',
      providerPaymentId: 'order-1',
      transactionId: 'capture-refunded',
      amount: 1,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-paypal-error',
    });

    expect(result).toEqual({
      status: 'failed',
      error: 'The capture has already been refunded.',
    });
  });

  it('preserves major units for Xendit refunds', async () => {
    fetchMock.mockResolvedValue(response({ id: 'xendit-refund-1', status: 'SUCCEEDED' }));

    const result = await refundExternalPayment({
      provider: 'XenditAdapter',
      providerPaymentId: 'payment-request-1',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-xendit-1',
    });

    expect(result).toEqual({ status: 'succeeded', refundId: 'xendit-refund-1' });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.amount).toBe(100);
    expect(request.currency).toBe('USD');
  });

  it('preserves major units for YooKassa refunds', async () => {
    fetchMock.mockResolvedValue(response({ id: 'yookassa-refund-1', status: 'succeeded' }));

    const result = await refundExternalPayment({
      provider: 'RussiaPaymentAdapter',
      providerPaymentId: 'yookassa-payment-1',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-yookassa-1',
      paymentMethod: 'MIR',
    });

    expect(result).toEqual({ status: 'succeeded', refundId: 'yookassa-refund-1' });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.amount).toEqual({
      value: '100.00',
      currency: 'USD',
    });
  });

  it('preserves major units for CloudPayments refunds', async () => {
    fetchMock.mockResolvedValue(
      response({
        Success: true,
        Model: { TransactionId: 456789 },
      }),
    );

    const result = await refundExternalPayment({
      provider: 'RussiaPaymentAdapter',
      providerPaymentId: '456789',
      transactionId: '456789',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-cloud-1',
      paymentMethod: 'MIR',
    });

    expect(result).toEqual({ status: 'succeeded', refundId: '456789' });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.Amount).toBe(100);
    expect(request.TransactionId).toBe(456789);
  });

  it('treats a CloudPayments business failure as failed even on HTTP 200', async () => {
    fetchMock.mockResolvedValue(
      response({
        Success: false,
        Message: 'Refund amount exceeds the refundable balance.',
      }),
    );

    const result = await refundExternalPayment({
      provider: 'RussiaPaymentAdapter',
      providerPaymentId: '456789',
      transactionId: '456789',
      amount: 999,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: 'refund-cloud-failure',
      paymentMethod: 'MIR',
    });

    expect(result).toEqual({
      status: 'failed',
      error: 'Refund amount exceeds the refundable balance.',
    });
  });

  it('rejects zero or non-finite refund amounts before any provider request', async () => {
    const invalidAmounts = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];

    for (const amount of invalidAmounts) {
      fetchMock.mockClear();

      const result = await refundExternalPayment({
        provider: 'GlobalCardAdapter',
        providerPaymentId: 'pi_invalid',
        amount,
        currency: 'USD',
        referenceId: 'payment-1',
        refundId: `refund-${String(amount)}`,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Refund amount must be greater than zero');
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it('rejects malformed refund currency and idempotency key before any provider request', async () => {
    const invalidCurrency = await refundExternalPayment({
      provider: 'GlobalCardAdapter',
      providerPaymentId: 'pi_invalid_currency',
      amount: 100,
      currency: 'US',
      referenceId: 'payment-1',
      refundId: 'refund-1',
    });

    expect(invalidCurrency).toEqual({
      status: 'failed',
      error: 'Refund currency must be a three-letter ISO currency code',
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const invalidRefundId = await refundExternalPayment({
      provider: 'GlobalCardAdapter',
      providerPaymentId: 'pi_invalid_refund_id',
      amount: 100,
      currency: 'USD',
      referenceId: 'payment-1',
      refundId: '   ',
    });

    expect(invalidRefundId).toEqual({
      status: 'failed',
      error: 'Refund idempotency key is required',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects configured unsupported Platega refunds explicitly', async () => {
    const result = await refundExternalPayment({
      provider: 'RussiaPaymentAdapter',
      providerPaymentId: 'platega-payment-1',
      amount: 100,
      currency: 'RUB',
      referenceId: 'payment-1',
      refundId: 'refund-platega-1',
      paymentMethod: 'CRYPTO',
    });

    expect(result).toEqual({
      status: 'failed',
      error: 'Platega refunds are not supported by the configured provider contract',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
