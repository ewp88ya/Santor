import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import { transitionPaymentFromWebhook } from '../modules/payment/payment.repository.js';

describe('PAYMENT WEBHOOK — PostgreSQL concurrency protection', () => {
  let subscriptionId: string;
  let paymentId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const tenant = await prisma.tenant.create({
      data: {
        name: `Webhook Race Tenant ${randomUUID()}`,
      },
    });

    const role = await prisma.role.findUnique({
      where: {
        name: 'USER',
      },
    });

    if (!role) {
      throw new Error('Required test role "user" not found');
    }

    const user = await prisma.user.create({
      data: {
        email: `webhook-race-${randomUUID()}@test.local`,
        passwordHash: 'test-password-hash',
        tenantId: tenant.id,
        roleId: role.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Webhook Race Product ${randomUUID()}`,
        code: `WEBHOOK-RACE-${randomUUID()}`,
        price: 1000,
        durationDays: 30,
        active: true,
      },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        productId: product.id,
        status: 'pending',
      },
    });

    subscriptionId = subscription.id;

    const payment = await prisma.payment.create({
      data: {
        subscriptionId,
        provider: 'test',
        country: 'DE',
        currency: 'EUR',
        paymentMethod: 'test',
        amount: 1000,
        status: 'pending',
        type: 'one_time',
        autoDebit: false,
      },
    });

    paymentId = payment.id;
  });

  afterAll(async () => {
    if (paymentId) {
      await prisma.payment.deleteMany({
        where: {
          id: paymentId,
        },
      });
    }

    if (subscriptionId) {
      await prisma.subscription.deleteMany({
        where: {
          id: subscriptionId,
        },
      });
    }

    await prisma.$disconnect();
  });

  it('allows only one concurrent webhook transition to win', async () => {
    const eventA = `test:webhook:race:a:${randomUUID()}`;
    const eventB = `test:webhook:race:b:${randomUUID()}`;

    const [resultA, resultB] = await Promise.all([
      prisma.$transaction((tx) =>
        transitionPaymentFromWebhook(
          {
            paymentId,
            status: 'success',
            transactionId: 'transaction-a',
            webhookEventId: eventA,
          },
          tx,
        ),
      ),
      prisma.$transaction((tx) =>
        transitionPaymentFromWebhook(
          {
            paymentId,
            status: 'failed',
            transactionId: 'transaction-b',
            webhookEventId: eventB,
          },
          tx,
        ),
      ),
    ]);

    const results = [resultA, resultB];
    const transitioned = results.filter((result) => result.transitioned);
    const notTransitioned = results.filter((result) => !result.transitioned);

    expect(transitioned).toHaveLength(1);
    expect(notTransitioned).toHaveLength(1);

    const finalPayment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    expect(finalPayment).not.toBeNull();
    expect(finalPayment?.status).toBe(resultA.transitioned ? 'success' : 'failed');
    expect(finalPayment?.webhookEventId).toBe(resultA.transitioned ? eventA : eventB);
    expect(finalPayment?.transactionId).toBe(
      resultA.transitioned ? 'transaction-a' : 'transaction-b',
    );

    expect(
      [eventA, eventB].filter((eventId) => finalPayment?.webhookEventId === eventId),
    ).toHaveLength(1);
  });
});
