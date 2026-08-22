import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RUSSIA_PAYMENT_ENABLED = 'true';
process.env.PLATEGA_MERCHANT_ID = 'test-merchant';
process.env.PLATEGA_SECRET = 'test-secret';
process.env.PLATEGA_BASE_URL = 'https://test.platega.local';

const prismaMock = {
  payment: {
    findUnique: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  license: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

prismaMock.$transaction.mockImplementation(
  async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
);

const transitionPaymentFromWebhookMock = vi.fn();
const activateEntitlementMock = vi.fn();
const activateEntitlementInTransactionMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock('../../../config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../payment.repository.js', () => ({
  transitionPaymentFromWebhook: transitionPaymentFromWebhookMock,
}));

vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlement: activateEntitlementMock,
  activateEntitlementInTransaction: activateEntitlementInTransactionMock,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

describe('Platega payment webhook reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    activateEntitlementMock.mockResolvedValue({
      subscriptionId: 'subscription-001',
      status: 'active',
    });

    activateEntitlementInTransactionMock.mockResolvedValue({
      subscriptionId: 'subscription-001',
      status: 'active',
    });
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

  function mockPaymentLookup(currentPayment: Record<string, unknown> = payment()) {
    prismaMock.payment.findUnique.mockImplementation(
      async (args: {
        where?: {
          id?: string;
          webhookEventId?: string;
        };
      }) => {
        if (args.where?.webhookEventId) {
          if (currentPayment.webhookEventId === args.where.webhookEventId) {
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

  it('reconciles successful Platega payment and activates entitlement', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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

    expect(transitionPaymentFromWebhookMock).toHaveBeenCalledWith(
      {
        paymentId: 'payment-001',
        status: 'success',
        transactionId: 'plt-001',
        webhookEventId: 'platega:plt-001:completed',
      },
      prismaMock,
    );

    expect(activateEntitlementInTransactionMock).toHaveBeenCalledTimes(1);
    expect(activateEntitlementInTransactionMock).toHaveBeenCalledWith(
      'subscription-001',
      prismaMock,
    );

    expect(activateEntitlementMock).not.toHaveBeenCalled();

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook.success',
        resource: 'payment',
        resourceId: 'payment-001',
        metadata: expect.objectContaining({
          eventId: 'platega:plt-001:completed',
          webhookType: 'payment.success',
          provider: 'RussiaPaymentAdapter',
          providerStatus: 'success',
          transactionId: 'plt-001',
        }),
      }),
    );
  });

  it('keeps webhook pending state without transitioning payment', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
  });

  it('ignores native Platega pending webhook without reconciling or transitioning', async () => {
    const { processPlategaWebhook } = await import('../payment.webhook.js');

    const result = await processPlategaWebhook({
      transactionId: 'plt-001',
      merchantTransactionId: 'payment-001',
      status: 'PENDING',
    });

    expect(result).toEqual({
      processed: false,
      ignored: true,
      reason: 'UNSUPPORTED_WEBHOOK_EVENT',
    });

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
  });

  it('processes failed Platega payment as failed without activating entitlement', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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

    expect(transitionPaymentFromWebhookMock).toHaveBeenCalledWith(
      {
        paymentId: 'payment-001',
        status: 'failed',
        transactionId: 'plt-001',
        webhookEventId: 'platega:plt-001:failed',
      },
      prismaMock,
    );

    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook.failed',
        resource: 'payment',
        resourceId: 'payment-001',
        metadata: expect.objectContaining({
          eventId: 'platega:plt-001:failed',
          webhookType: 'payment.failed',
          provider: 'RussiaPaymentAdapter',
          providerStatus: 'failed',
          transactionId: 'plt-001',
        }),
      }),
    );
  });

  it('handles duplicate Platega webhook idempotently', async () => {
    const duplicatePayment = payment({
      webhookEventId: 'platega:plt-001:duplicate',
      status: 'success',
    });

    mockPaymentLookup(duplicatePayment);

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
  });

  it('does not activate entitlement when webhook transition is not performed', async () => {
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
      transitioned: false,
      payment: {
        ...payment(),
        status: 'success',
        transactionId: 'plt-001',
      },
    });

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'platega:plt-001:already-success',
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
      status: 'success',
    });

    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook.success',
      }),
    );
  });

  it('does not write success audit when entitlement activation fails', async () => {
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

    const activationError = new Error('Entitlement activation failed');
    activateEntitlementInTransactionMock.mockRejectedValueOnce(activationError);

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:activation-failed',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toThrow('Entitlement activation failed');

    expect(activateEntitlementInTransactionMock).toHaveBeenCalledWith(
      'subscription-001',
      prismaMock,
    );

    expect(activateEntitlementMock).not.toHaveBeenCalled();

    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook.success',
      }),
    );
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
  });

  it('ignores forged success webhook while provider remains pending', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    const result = await processPaymentWebhook({
      eventId: 'forged-success-event',
      type: 'payment.success',
      paymentId: 'payment-001',
      transactionId: 'attacker-tx',
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
    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();
  });

  it('rejects a success webhook when provider verification returns a non-success status', async () => {
    mockPaymentLookup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'plt-001',
          transactionId: 'plt-001',
          merchantTransactionId: 'payment-001',
          status: 'CANCELLED',
          amount: 100,
          currency: 'RUB',
        }),
        { status: 200 },
      ),
    );

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'forged-success-cancelled-event',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'attacker-tx',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Payment webhook type does not match provider status: expected payment.failed',
    });

    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(activateEntitlementMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook.success',
      }),
    );
  });
});
