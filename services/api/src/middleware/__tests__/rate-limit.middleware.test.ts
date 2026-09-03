import { describe, expect, it } from 'vitest';

import { dashboardRateLimit, deviceRateLimit, paymentRateLimit } from '../rate-limit.middleware.js';

function request(userId: string, ip = '198.51.100.10') {
  return {
    ip,
    user: {
      id: userId,
    },
  } as any;
}

async function expectRateLimited(
  rateLimit: (request: any, reply: any) => Promise<void>,
  userId: string,
  maxRequests: number,
) {
  for (let attempt = 0; attempt < maxRequests; attempt += 1) {
    await rateLimit(request(userId), {} as any);
  }

  await expect(rateLimit(request(userId), {} as any)).rejects.toMatchObject({
    statusCode: 429,
  });
}

describe('Rate Limit Security', () => {
  it('rate-limits dashboard requests after the configured threshold', async () => {
    await expectRateLimited(dashboardRateLimit, `dashboard-user-${Date.now()}-1`, 30);
  });

  it('rate-limits device requests after the configured threshold', async () => {
    await expectRateLimited(deviceRateLimit, `device-user-${Date.now()}-2`, 20);
  });

  it('rate-limits payment requests after the configured threshold', async () => {
    await expectRateLimited(paymentRateLimit, `payment-user-${Date.now()}-3`, 20);
  });

  it('uses the request IP when the authenticated user is unavailable', async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
    const unauthenticatedRequest = { ip, user: undefined } as any;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await dashboardRateLimit(unauthenticatedRequest, {} as any);
    }

    await expect(dashboardRateLimit(unauthenticatedRequest, {} as any)).rejects.toMatchObject({
      statusCode: 429,
    });
  });
});
