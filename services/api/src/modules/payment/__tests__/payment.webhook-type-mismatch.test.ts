import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RUSSIA_PAYMENT_ENABLED = 'true';
process.env.PLATEGA_MERCHANT_ID = 'test-merchant';
process.env.PLATEGA_SECRET = 'test-secret';
process.env.PLATEGA_BASE_URL = 'https://test.platega.local';

const {
  paymentFindUniqueMock,
  transitionPaymentFromWebhookMock,
  activateEntitlementInTransactionMock,
  auditLogMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  paymentFindUniqueMock: vi.fn(),
  transitionPaymentFromWebhookMock: vi.fn(),
  activateEntitlementInTransactionMock: vi.fn(),
  auditLogMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}));

vi.mock('../../../config/database.js', () => ({
  prisma: {
    payment: {
      findUnique: paymentFindUniqueMock,
    },
    $transaction: prismaTransactionMock,
  },
}));

vi.mock('../payment.repository.js', () => ({
  transitionPaymentFromWebhook: transitionPaymentFromWebhookMock,
}));

vi.mock('../../entitlement/entitlement.service.js', () => ({
  activateEntitlementInTransaction: activateEntitlementInTransactionMock,
}));

vi.mock('../../audit/audit.service.js', () => ({
  auditLog: auditLogMock,
}));

describe('Payment webhook type verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const payment = {
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
    };

    paymentFindUniqueMock.mockImplementation(
      async (args: {
        where?: {
          id?: string;
          webhookEventId?: string;
        };
      }) => {
        if (args.where?.webhookEventId) {
          return null;
        }

        if (args.where?.id === 'payment-001') {
          return payment;
        }

        return null;
      },
    );

    prismaTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({}),
    );

    auditLogMock.mockResolvedValue(undefined);
  });

  it('rejects payment.failed webhook when provider verification says success', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:failed',
        type: 'payment.failed',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Payment webhook type does not match provider status: expected payment.success',
    });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 'user-001',
      action: 'PAYMENT_WEBHOOK_TYPE_MISMATCH',
      resource: 'payment',
      resourceId: 'payment-001',
      metadata: {
        eventId: 'platega:plt-001:failed',
        webhookType: 'payment.failed',
        expectedWebhookType: 'payment.success',
        provider: 'RussiaPaymentAdapter',
        providerStatus: 'success',
        transactionId: 'plt-001',
      },
    });
  });

  it('rejects payment.success webhook when provider verification says failed', async () => {
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

    const { processPaymentWebhook } = await import('../payment.webhook.js');

    await expect(
      processPaymentWebhook({
        eventId: 'platega:plt-001:success',
        type: 'payment.success',
        paymentId: 'payment-001',
        transactionId: 'plt-001',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Payment webhook type does not match provider status: expected payment.failed',
    });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(transitionPaymentFromWebhookMock).not.toHaveBeenCalled();
    expect(activateEntitlementInTransactionMock).not.toHaveBeenCalled();

    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 'user-001',
      action: 'PAYMENT_WEBHOOK_TYPE_MISMATCH',
      resource: 'payment',
      resourceId: 'payment-001',
      metadata: {
        eventId: 'platega:plt-001:success',
        webhookType: 'payment.success',
        expectedWebhookType: 'payment.failed',
        provider: 'RussiaPaymentAdapter',
        providerStatus: 'failed',
        transactionId: 'plt-001',
      },
    });
  });
});
