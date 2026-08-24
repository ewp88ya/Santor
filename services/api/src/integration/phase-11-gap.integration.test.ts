import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import { renewSubscription } from '../modules/payment/payment.renewal.service.js';
import { transitionPaymentFromWebhook } from '../modules/payment/payment.repository.js';
import { activateEntitlementInTransaction } from '../modules/entitlement/entitlement.service.js';

/*
 * Phase 11 — Integration / Failure / Race Testing
 *
 * These tests intentionally use the real PostgreSQL database.
 * They cover the database-backed lifecycle boundaries without calling
 * real external payment providers.
 */

type Fixture = {
  tenantId: string;
  roleId: string;
  userId: string;
  productId: string;
  subscriptionId: string;
  paymentId: string;
};

const fixtures: Fixture[] = [];

async function createFixture(options: {
  productCode?: string;
  subscriptionStatus?: string;
  endDate?: Date;
  autoDebitEnabled?: boolean;
  renewalAttempts?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  country?: string;
  provider?: string;
  webhookEventId?: string | null;
}) {
  const suffix = randomUUID();

  const tenant = await prisma.tenant.create({
    data: {
      name: `phase11-tenant-${suffix}`,
    },
  });

  const role = await prisma.role.create({
    data: {
      name: `phase11-role-${suffix}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `phase11-${suffix}@example.invalid`,
      passwordHash: 'phase11-test-hash',
      tenantId: tenant.id,
      roleId: role.id,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: `Phase 11 Product ${suffix}`,
      code: options.productCode ?? `GENERAL-FREE-${suffix}`,
      price: 1000,
      currency: 'USD',
      durationDays: 30,
      deviceLimit: 1,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      productId: product.id,
      status: options.subscriptionStatus ?? 'pending',
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: options.endDate,
      autoDebitEnabled: options.autoDebitEnabled ?? false,
      paymentCustomerId: options.autoDebitEnabled ? 'phase11-customer' : null,
      paymentMethodId: options.autoDebitEnabled ? 'phase11-method' : null,
      renewalAttempts: options.renewalAttempts ?? 0,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      provider: options.provider ?? 'Phase11TestProvider',
      country: options.country ?? 'US',
      currency: 'USD',
      paymentMethod: options.paymentMethod ?? 'VISA',
      amount: 1000,
      status: options.paymentStatus ?? 'pending',
      type: 'one_time',
      providerPaymentId: 'phase11-provider-payment',
      webhookEventId: options.webhookEventId ?? null,
    },
  });

  const fixture = {
    tenantId: tenant.id,
    roleId: role.id,
    userId: user.id,
    productId: product.id,
    subscriptionId: subscription.id,
    paymentId: payment.id,
  };

  fixtures.push(fixture);

  return fixture;
}

async function cleanupFixture(fixture: Fixture) {
  await prisma.auditLog.deleteMany({ where: { userId: fixture.userId } });
  await prisma.tenant.delete({ where: { id: fixture.tenantId } });
  await prisma.role.delete({ where: { id: fixture.roleId } });
  await prisma.product.delete({ where: { id: fixture.productId } });
}

describe('PHASE 11 GAP — real payment lifecycle integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const fixture of fixtures.splice(0)) {
      await cleanupFixture(fixture);
    }

    await prisma.$disconnect();
  });

  it('payment integration: transitions a pending payment to success atomically at repository level', async () => {
    const fixture = await createFixture();

    const result = await prisma.$transaction(async (tx) =>
      transitionPaymentFromWebhook(
        {
          paymentId: fixture.paymentId,
          status: 'success',
          transactionId: 'phase11-tx-success',
          webhookEventId: 'phase11-event-success',
        },
        tx,
      ),
    );

    expect(result.transitioned).toBe(true);

    const payment = await prisma.payment.findUnique({ where: { id: fixture.paymentId } });
    expect(payment?.status).toBe('success');
    expect(payment?.transactionId).toBe('phase11-tx-success');
    expect(payment?.webhookEventId).toBe('phase11-event-success');
  });

  it('webhook replay: the same event becomes a duplicate on replay', async () => {
    const fixture = await createFixture();
    const event = {
      paymentId: fixture.paymentId,
      status: 'success' as const,
      transactionId: 'phase11-replay-tx',
      webhookEventId: 'phase11-replay-event',
    };

    const first = await prisma.$transaction((tx) => transitionPaymentFromWebhook(event, tx));
    const second = await prisma.$transaction((tx) => transitionPaymentFromWebhook(event, tx));

    expect(first.transitioned).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.transitioned).toBe(false);
  });

  it('duplicate webhook integration: a different event cannot re-transition a terminal payment', async () => {
    const fixture = await createFixture({
      paymentStatus: 'success',
      webhookEventId: 'phase11-original-event',
    });

    const result = await prisma.$transaction((tx) =>
      transitionPaymentFromWebhook(
        {
          paymentId: fixture.paymentId,
          status: 'success',
          transactionId: 'phase11-duplicate-tx',
          webhookEventId: 'phase11-different-event',
        },
        tx,
      ),
    );

    expect(result.transitioned).toBe(false);
    expect(result.duplicate).toBe(false);

    const payment = await prisma.payment.findUnique({ where: { id: fixture.paymentId } });
    expect(payment?.webhookEventId).toBe('phase11-original-event');
  });

  it('race condition: concurrent webhook transitions leave exactly one terminal state', async () => {
    const fixture = await createFixture();

    const run = (transactionId: string) =>
      prisma.$transaction(
        (tx) =>
          transitionPaymentFromWebhook(
            {
              paymentId: fixture.paymentId,
              status: 'success',
              transactionId,
              webhookEventId: `phase11-race-${transactionId}`,
            },
            tx,
          ),
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      );

    const results = await Promise.allSettled([run('a'), run('b')]);
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof transitionPaymentFromWebhook>>> =>
        result.status === 'fulfilled',
    );

    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(fulfilled.filter((result) => result.value.transitioned).length).toBe(1);

    const payment = await prisma.payment.findUnique({ where: { id: fixture.paymentId } });
    expect(payment?.status).toBe('success');
    expect(['phase11-race-a', 'phase11-race-b']).toContain(payment?.webhookEventId);
  });

  it('transaction rollback: entitlement failure rolls the payment mutation back', async () => {
    const fixture = await createFixture();

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.payment.update({
            where: { id: fixture.paymentId },
            data: {
              status: 'success',
              transactionId: 'phase11-rollback-tx',
            },
          });

          // No license exists for this subscription, so activation must fail.
          await activateEntitlementInTransaction(fixture.subscriptionId, tx);
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      ),
    ).rejects.toThrow('Cannot activate entitlement without license');

    const payment = await prisma.payment.findUnique({ where: { id: fixture.paymentId } });
    const subscription = await prisma.subscription.findUnique({ where: { id: fixture.subscriptionId } });

    expect(payment?.status).toBe('pending');
    expect(payment?.transactionId).toBeNull();
    expect(subscription?.status).toBe('pending');
  });

  it('auto-renew integration: disabled auto-debit is skipped without creating a renewal payment', async () => {
    const fixture = await createFixture({
      subscriptionStatus: 'active',
      autoDebitEnabled: false,
      endDate: new Date(Date.now() - 60_000),
    });

    const result = await renewSubscription(fixture.subscriptionId);

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('AUTO_DEBIT_DISABLED');

    const payments = await prisma.payment.findMany({ where: { subscriptionId: fixture.subscriptionId } });
    expect(payments).toHaveLength(1);
  });

  it('auto-renew integration: unavailable provider records a failed renewal and schedules retry', async () => {
    const fixture = await createFixture({
      subscriptionStatus: 'active',
      autoDebitEnabled: true,
      endDate: new Date(Date.now() - 60_000),
      paymentMethod: 'SBP',
      country: 'RU',
      provider: 'RussiaPaymentAdapter',
      paymentStatus: 'success',
    });

    const result = await renewSubscription(fixture.subscriptionId);

    expect(result.renewed).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.reason).toContain('payment provider');

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: fixture.subscriptionId },
      orderBy: { createdAt: 'asc' },
    });

    expect(payments).toHaveLength(2);
    expect(payments[1].status).toBe('failed');

    const subscription = await prisma.subscription.findUnique({ where: { id: fixture.subscriptionId } });
    expect(subscription?.renewalAttempts).toBe(1);
    expect(subscription?.nextRenewalAttemptAt).not.toBeNull();
  });

  it('renewal race-condition: only one concurrent worker claims the renewal attempt', async () => {
    const fixture = await createFixture({
      subscriptionStatus: 'active',
      autoDebitEnabled: true,
      endDate: new Date(Date.now() - 60_000),
      paymentMethod: 'SBP',
      country: 'RU',
      provider: 'RussiaPaymentAdapter',
      paymentStatus: 'success',
    });

    const results = await Promise.all([
      renewSubscription(fixture.subscriptionId),
      renewSubscription(fixture.subscriptionId),
    ]);

    const claimed = results.filter((result) => result.reason !== 'RENEWAL_ALREADY_CLAIMED');
    const skipped = results.filter((result) => result.reason === 'RENEWAL_ALREADY_CLAIMED');

    expect(claimed).toHaveLength(1);
    expect(skipped).toHaveLength(1);

    const payments = await prisma.payment.findMany({ where: { subscriptionId: fixture.subscriptionId } });
    expect(payments).toHaveLength(2);
  });

  it('failure/recovery state: renewal attempt increments without prematurely activating the subscription', async () => {
    const fixture = await createFixture({
      subscriptionStatus: 'active',
      autoDebitEnabled: true,
      endDate: new Date(Date.now() - 60_000),
      paymentMethod: 'SBP',
      country: 'RU',
      provider: 'RussiaPaymentAdapter',
      paymentStatus: 'success',
    });

    const result = await renewSubscription(fixture.subscriptionId);

    expect(result.renewed).toBe(false);

    const subscription = await prisma.subscription.findUnique({ where: { id: fixture.subscriptionId } });
    expect(subscription?.status).toBe('active');
    expect(subscription?.renewalAttempts).toBe(1);
    expect(subscription?.gracePeriodEnd).toBeNull();
    expect(subscription?.nextRenewalAttemptAt).not.toBeNull();
  });

  it('failure/recovery terminal state: max renewal attempts enters grace period', async () => {
    const fixture = await createFixture({
      subscriptionStatus: 'active',
      autoDebitEnabled: true,
      endDate: new Date(Date.now() - 60_000),
      renewalAttempts: 3,
    });

    const result = await renewSubscription(fixture.subscriptionId);

    expect(result.renewed).toBe(false);
    expect(result.reason).toBe('MAX_RENEWAL_ATTEMPTS_REACHED');
    expect(result.gracePeriodEnd).toBeInstanceOf(Date);

    const subscription = await prisma.subscription.findUnique({ where: { id: fixture.subscriptionId } });
    expect(subscription?.gracePeriodEnd).not.toBeNull();
  });
});
