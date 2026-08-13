import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RUSSIA_PAYMENT_ENABLED = 'true';
process.env.PLATEGA_MERCHANT_ID = 'test-merchant';
process.env.PLATEGA_SECRET = 'test-secret';
process.env.PLATEGA_BASE_URL = 'https://test.platega.local';

const prismaMock = {
  payment: {
    findUnique: vi.fn(),
  },
};

const transitionPaymentFromWebhookMock = vi.fn();
const generateLicenseMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../payment.repository.js', () => ({
  transitionPaymentFromWebhook: transitionPaymentFromWebhookMock,
}));

vi.mock('../../license/license.service.js', () => ({
  generateLicense: generateLicenseMock,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

describe('Platega payment webhook reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function payment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'payment-001',
      provider: 'RussiaPaymentAdapter',
      providerPaymentId: 'plt-001',
      transactionId: null,
      amount: 100,
      currency: 'RUB',
      status: 'pending',
      subscriptionId: 'subscription-001',
      webhookEventId: null,
      subscription: {
        id: 'subscription-001',
        userId: 'user-001',
      },
      ...overrides,
    };
  }

  function mockPaymentLookup(
    currentPayment: Record<string, unknown> = payment(),
  ) {
    prismaMock.payment.findUnique.mockImplementation(
      async (args: {
        where?: {
          id?: string;
          webhookEventId?: string;
        };
      }) => {
        if (args.where?.webhookEventId) {
          if (
            currentPayment.webhookEventId ===
            args.where.webhookEventId
          ) {
            return currentPayment;
          }

          return null;
        }

        if (args.where?.id) {
          if (args.where.id === currentPayment.id) {
            return currentPayment;
          }

          return null;
        }

        return null;
      },
    );
  }

  it('reconciles successful Platega payment', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'COMPLETED',
          amount: 100,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    transitionPaymentFromWebhookMock.mockResolvedValue({
      duplicate: false,
      transitioned: true,
      payment: {
        ...payment(),
        status: 'success',
        transactionId: 'plt-001',
      },
    });

    generateLicenseMock.mockResolvedValue(undefined);

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'platega:plt-001:completed',
      type: 'payment.success',
      paymentId: 'payment-001',
      transactionId: 'plt-001',
    });

    expect(result).toMatchObject({
      processed: true,
      duplicate: false,
      reconciled: true,
      transitioned: true,
      paymentId: 'payment-001',
      status: 'success',
    });

    expect(transitionPaymentFromWebhookMock).toHaveBeenCalledWith({
      paymentId: 'payment-001',
      status: 'success',
      transactionId: 'plt-001',
      webhookEventId: 'platega:plt-001:completed',
    });

    expect(generateLicenseMock).toHaveBeenCalledWith(
      'subscription-001',
    );
  });

  it('does not trust webhook success when Platega is still pending', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'PENDING',
          amount: 100,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'platega:plt-001:pending',
      type: 'payment.success',
      paymentId: 'payment-001',
      transactionId: 'plt-001',
    });

    expect(result).toMatchObject({
      processed: true,
      duplicate: false,
      reconciled: true,
      transitioned: false,
      paymentId: 'payment-001',
      status: 'pending',
    });

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(generateLicenseMock).not.toHaveBeenCalled();
  });

  it('rejects Platega reference ID mismatch', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'different-payment',
          status: 'COMPLETED',
          amount: 100,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:reference-mismatch',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
        resource: 'payment',
        resourceId: 'payment-001',
        metadata: expect.objectContaining({
          reason: 'REFERENCE_ID_MISMATCH',
        }),
      }),
    );

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
  });

  it('rejects Platega amount mismatch', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'COMPLETED',
          amount: 999,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:amount-mismatch',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
        resource: 'payment',
        resourceId: 'payment-001',
        metadata: expect.objectContaining({
          reason: 'AMOUNT_MISMATCH',
        }),
      }),
    );

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
  });

  it('rejects Platega currency mismatch', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'COMPLETED',
          amount: 100,
          currency: 'USD',
        }),
        { status: 200 },
      ),
    );

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:currency-mismatch',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_WEBHOOK_RECONCILIATION_MISMATCH',
        resource: 'payment',
        resourceId: 'payment-001',
        metadata: expect.objectContaining({
          reason: 'CURRENCY_MISMATCH',
        }),
      }),
    );

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
  });

  it('processes failed Platega payment as failed', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'FAILED',
          amount: 100,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    transitionPaymentFromWebhookMock.mockResolvedValue({
      duplicate: false,
      transitioned: true,
      payment: {
        ...payment(),
        status: 'failed',
        transactionId: 'plt-001',
      },
    });

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'platega:plt-001:failed',
      type: 'payment.failed',
      paymentId: 'payment-001',
      transactionId: 'plt-001',
    });

    expect(result).toMatchObject({
      processed: true,
      duplicate: false,
      reconciled: true,
      transitioned: true,
      paymentId: 'payment-001',
      status: 'failed',
    });

    expect(transitionPaymentFromWebhookMock).toHaveBeenCalledWith({
      paymentId: 'payment-001',
      status: 'failed',
      transactionId: 'plt-001',
      webhookEventId: 'platega:plt-001:failed',
    });

    expect(generateLicenseMock).not.toHaveBeenCalled();
  });

  it('handles duplicate Platega webhook idempotently', async () => {
    const duplicatePayment = payment({
      webhookEventId: 'platega:plt-001:duplicate',
      status: 'success',
    });

    mockPaymentLookup(duplicatePayment);

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'platega:plt-001:duplicate',
      type: 'payment.success',
      paymentId: 'payment-001',
      transactionId: 'plt-001',
    });

    expect(result).toMatchObject({
      processed: true,
      duplicate: true,
      reconciled: false,
      transitioned: false,
      paymentId: 'payment-001',
      status: 'success',
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
  });

  it('fails safely when Platega verification fails', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'temporary provider error',
        }),
        { status: 500 },
      ),
    );

    const { processPaymentWebhook } =
      await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:error',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(generateLicenseMock).not.toHaveBeenCalled();
  });
});
