import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const mockPaymentProvider = {
  charge: vi.fn(async (request: { referenceId: string }) => ({
    success: true,
    transactionId: `mock_tx_${request.referenceId}`,
    providerPaymentId: `mock_pi_${request.referenceId}`,
  })),

  verifyPayment: vi.fn(async (paymentId: string) => ({
    status: 'success' as const,
    providerPaymentId: paymentId,
    transactionId: `mock_tx_${paymentId.replace(/^mock_pi_/, '')}`,
  })),
};

vi.mock('../modules/payment/payment.router.js', () => ({
  routePaymentProvider: () => mockPaymentProvider,
}));

import { createApp } from '../server.js';
import { prisma } from '../config/database.js';

describe('PHASE 12 — full end-to-end integration verification', () => {
  const suffix = randomUUID();
  const email = `phase12-e2e-${suffix}@example.invalid`;
  const password = 'Phase12-E2E-Password-123';

  let app: Awaited<ReturnType<typeof createApp>>;
  let userId = '';
  let token = '';
  let subscriptionId = '';
  let licenseId = '';
  let vpnAccessId = '';
  let paymentId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.auditLog.deleteMany({
        where: {
          userId,
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: userId,
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('completes the authenticated application lifecycle end-to-end', async () => {
    /*
     * ------------------------------------------------------------------
     * 1. REGISTER
     * ------------------------------------------------------------------
     */
    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password,
        name: 'Phase 12 E2E',
      },
    });

    if (register.statusCode !== 200) {
      console.error('[PHASE-12 REGISTER FAILURE]', {
        statusCode: register.statusCode,
        body: register.body,
      });
    }

    expect(register.statusCode).toBe(200);

    const registered = register.json<{
      id: string;
      email: string;
      token: string;
    }>();

    userId = registered.id;
    token = registered.token;

    expect(registered.email).toBe(email);
    expect(token).toBeTruthy();

    /*
     * ------------------------------------------------------------------
     * 2. FIND REAL WG-1M PRODUCT
     * ------------------------------------------------------------------
     */
    const wireGuardProduct = await prisma.product.findUnique({
      where: {
        code: 'WG-1M',
      },
    });

    expect(wireGuardProduct).toBeTruthy();
    expect(wireGuardProduct?.active).toBe(true);

    /*
     * ------------------------------------------------------------------
     * 3. CREATE PAID SUBSCRIPTION
     * ------------------------------------------------------------------
     */
    const createSubscription = await app.inject({
      method: 'POST',
      url: '/api/v1/subscriptions',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: wireGuardProduct!.id,
      },
    });

    expect(createSubscription.statusCode).toBe(200);

    const createdSubscription = createSubscription.json<{
      id: string;
      status: string;
      product: {
        code: string;
      };
      license?: {
        id: string;
        status: string;
      } | null;
    }>();

    subscriptionId = createdSubscription.id;

    expect(subscriptionId).toBeTruthy();
    expect(createdSubscription.status).toBe('pending');
    expect(createdSubscription.product.code).toBe('WG-1M');

    /*
     * The subscription lifecycle now provisions its license at creation.
     * The license remains pending until payment success activates the
     * entitlement.
     */
    expect(createdSubscription.license).toBeTruthy();
    expect(createdSubscription.license?.id).toBeTruthy();
    expect(createdSubscription.license?.status).toBe('pending');

    licenseId = createdSubscription.license!.id;

    /*
     * ------------------------------------------------------------------
     * 4. VERIFY REAL PRODUCT PRICE USED BY PAYMENT
     * ------------------------------------------------------------------
     */
    const productPrice = await prisma.productPrice.findFirst({
      where: {
        productId: wireGuardProduct!.id,
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(productPrice).toBeTruthy();

    const paymentCountry = productPrice!.country ?? 'US';
    const paymentCurrency = productPrice!.currency;

    expect(paymentCurrency).toBeTruthy();

    /*
     * ------------------------------------------------------------------
     * 5. CREATE PAYMENT
     * ------------------------------------------------------------------
     */
    const payment = await app.inject({
      method: 'POST',
      url: '/api/v1/payments',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        subscriptionId,
        country: paymentCountry,
        currency: paymentCurrency,
        paymentMethod: 'VISA',
      },
    });

    expect(payment.statusCode).toBe(200);

    const paymentBody = payment.json<{
      payment: {
        id: string;
        status: string;
        subscriptionId: string;
        providerPaymentId?: string | null;
        transactionId?: string | null;
        currency?: string | null;
        country?: string | null;
      };
      provider: {
        name: string;
        paymentId?: string;
        transactionId?: string;
      };
    }>();

    paymentId = paymentBody.payment.id;

    expect(paymentId).toBeTruthy();
    expect(paymentBody.payment.subscriptionId).toBe(subscriptionId);
    expect(paymentBody.payment.status).toBe('pending');
    expect(paymentBody.payment.currency).toBe(paymentCurrency);
    expect(paymentBody.payment.country).toBe(paymentCountry.toUpperCase());

    expect(paymentBody.payment.providerPaymentId).toBe(`mock_pi_${paymentId}`);
    expect(paymentBody.payment.transactionId).toBe(`mock_tx_${paymentId}`);

    expect(paymentBody.provider.paymentId).toBe(`mock_pi_${paymentId}`);
    expect(paymentBody.provider.transactionId).toBe(`mock_tx_${paymentId}`);

    /*
     * ------------------------------------------------------------------
     * 6. PAYMENT SUCCESS
     * ------------------------------------------------------------------
     *
     * This executes the atomic lifecycle:
     *
     *   payment      -> success
     *   subscription -> active
     *   license      -> active
     *   VPN access   -> active
     */
    const paymentSuccess = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${paymentId}/success`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        transactionId: `mock_tx_${paymentId}`,
      },
    });

    expect(paymentSuccess.statusCode).toBe(200);

    const paymentSuccessBody = paymentSuccess.json<{
      id: string;
      status: string;
      transactionId: string;
    }>();

    expect(paymentSuccessBody.id).toBe(paymentId);
    expect(paymentSuccessBody.status).toBe('success');
    expect(paymentSuccessBody.transactionId).toBe(`mock_tx_${paymentId}`);

    expect(mockPaymentProvider.charge).toHaveBeenCalledTimes(1);
    expect(mockPaymentProvider.verifyPayment).toHaveBeenCalledTimes(1);

    /*
     * ------------------------------------------------------------------
     * 7. READ SUBSCRIPTION
     * ------------------------------------------------------------------
     */
    const subscriptions = await app.inject({
      method: 'GET',
      url: '/api/v1/subscriptions',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(subscriptions.statusCode).toBe(200);

    const subscriptionList = subscriptions.json<
      Array<{
        id: string;
        status: string;
        product?: {
          code: string;
        };
        license?: {
          id: string;
          status?: string;
          vpnAccess?: {
            id: string;
            active: boolean;
          } | null;
        } | null;
      }>
    >();

    const subscription = subscriptionList.find((item) => item.id === subscriptionId);

    expect(subscription).toBeTruthy();
    expect(subscription!.product?.code).toBe('WG-1M');
    expect(subscription!.status).toBe('active');

    licenseId = subscription!.license?.id ?? licenseId;
    vpnAccessId = subscription!.license?.vpnAccess?.id ?? '';

    expect(licenseId).toBeTruthy();
    expect(subscription!.license?.status).toBe('active');

    expect(vpnAccessId).toBeTruthy();
    expect(subscription!.license?.vpnAccess?.active).toBe(true);

    /*
     * ------------------------------------------------------------------
     * 8. VERIFY VPN ACCESS
     * ------------------------------------------------------------------
     */
    const vpnAccess = await app.inject({
      method: 'POST',
      url: '/api/v1/vpn-access',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        licenseId,
      },
    });

    expect(vpnAccess.statusCode).toBe(200);

    const vpnAccessBody = vpnAccess.json<{
      id: string;
      active: boolean;
      license: {
        id: string;
      };
    }>();

    vpnAccessId = vpnAccessBody.id;

    expect(vpnAccessId).toBeTruthy();
    expect(vpnAccessBody.active).toBe(true);
    expect(vpnAccessBody.license.id).toBe(licenseId);

    /*
     * ------------------------------------------------------------------
     * 9. VERIFY DASHBOARD
     * ------------------------------------------------------------------
     */
    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(dashboard.statusCode).toBe(200);

    const dashboardBody = dashboard.json<{
      user: {
        id: string;
        email: string;
      };
      subscription: {
        id: string;
        status: string;
        license: {
          id: string;
          status?: string;
          vpnAccess: {
            id: string;
            active: boolean;
          } | null;
        } | null;
      } | null;
    }>();

    expect(dashboardBody.user.id).toBe(userId);
    expect(dashboardBody.user.email).toBe(email);

    expect(dashboardBody.subscription?.id).toBe(subscriptionId);
    expect(dashboardBody.subscription?.status).toBe('active');

    expect(dashboardBody.subscription?.license?.id).toBe(licenseId);
    expect(dashboardBody.subscription?.license?.status).toBe('active');

    expect(dashboardBody.subscription?.license?.vpnAccess?.id).toBe(vpnAccessId);

    expect(dashboardBody.subscription?.license?.vpnAccess?.active).toBe(true);

    /*
     * ------------------------------------------------------------------
     * 10. FINAL DATABASE VERIFICATION
     * ------------------------------------------------------------------
     */
    const databaseState = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      include: {
        product: true,
        license: {
          include: {
            vpnAccess: true,
          },
        },
        payments: true,
      },
    });

    expect(databaseState?.userId).toBe(userId);
    expect(databaseState?.product.code).toBe('WG-1M');
    expect(databaseState?.status).toBe('active');

    expect(databaseState?.license?.id).toBe(licenseId);
    expect(databaseState?.license?.status).toBe('active');

    expect(databaseState?.license?.vpnAccess?.id).toBe(vpnAccessId);
    expect(databaseState?.license?.vpnAccess?.active).toBe(true);

    const databasePayment = databaseState?.payments.find((item) => item.id === paymentId);

    expect(databasePayment?.status).toBe('success');
    expect(databasePayment?.providerPaymentId).toBe(`mock_pi_${paymentId}`);
    expect(databasePayment?.transactionId).toBe(`mock_tx_${paymentId}`);
  });
});
