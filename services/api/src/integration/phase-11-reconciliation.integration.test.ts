import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import {
  transitionPaymentFromWebhook,
  updatePaymentProvider,
} from '../modules/payment/payment.repository.js';

async function createFixture() {
  const suffix = randomUUID();
  const tenant = await prisma.tenant.create({
    data: { name: `phase11-reconcile-tenant-${suffix}` },
  });
  const role = await prisma.role.create({ data: { name: `phase11-reconcile-role-${suffix}` } });
  const user = await prisma.user.create({
    data: {
      email: `phase11-reconcile-${suffix}@example.invalid`,
      passwordHash: 'phase11-test-hash',
      tenantId: tenant.id,
      roleId: role.id,
    },
  });
  const product = await prisma.product.create({
    data: {
      name: `Phase 11 Reconciliation Product ${suffix}`,
      code: `RECON-${suffix}`,
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
      status: 'pending',
      startDate: new Date(),
      autoDebitEnabled: false,
    },
  });
  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      provider: 'Phase11TestProvider',
      country: 'US',
      currency: 'USD',
      paymentMethod: 'VISA',
      amount: 1000,
      status: 'pending',
      type: 'one_time',
    },
  });
  return { tenant, role, user, product, subscription, payment };
}

describe('PHASE 11 — payment reconciliation integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reconciles provider identifiers before final webhook settlement', async () => {
    const fixture = await createFixture();

    await updatePaymentProvider(fixture.payment.id, {
      providerPaymentId: 'provider-reconciled-123',
      transactionId: 'provider-tx-123',
      settlementCurrency: 'USD',
    });

    const beforeWebhook = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    expect(beforeWebhook?.status).toBe('pending');
    expect(beforeWebhook?.providerPaymentId).toBe('provider-reconciled-123');
    expect(beforeWebhook?.transactionId).toBe('provider-tx-123');
    expect(beforeWebhook?.settlementCurrency).toBe('USD');

    const result = await prisma.$transaction((tx) =>
      transitionPaymentFromWebhook(
        {
          paymentId: fixture.payment.id,
          status: 'success',
          transactionId: 'provider-tx-123',
          webhookEventId: 'phase11-reconcile-event-123',
        },
        tx,
      ),
    );

    expect(result.transitioned).toBe(true);

    const reconciled = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    expect(reconciled?.status).toBe('success');
    expect(reconciled?.providerPaymentId).toBe('provider-reconciled-123');
    expect(reconciled?.transactionId).toBe('provider-tx-123');
    expect(reconciled?.webhookEventId).toBe('phase11-reconcile-event-123');

    await prisma.auditLog.deleteMany({ where: { userId: fixture.user.id } });
    await prisma.payment.delete({ where: { id: fixture.payment.id } });
    await prisma.subscription.delete({ where: { id: fixture.subscription.id } });
    await prisma.tenant.delete({ where: { id: fixture.tenant.id } });
    await prisma.role.delete({ where: { id: fixture.role.id } });
    await prisma.product.delete({ where: { id: fixture.product.id } });
  });
});
