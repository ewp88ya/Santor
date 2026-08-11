import type { FastifyReply, FastifyRequest } from 'fastify';

import createError from 'http-errors';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requests = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

export async function dashboardRateLimit(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user as {
    id?: string;
  };

  const key = `dashboard:${user?.id ?? request.ip}`;
  const now = Date.now();
  const current = requests.get(key);

  if (!current || current.resetAt <= now) {
    requests.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return;
  }

  current.count += 1;

  if (current.count > MAX_REQUESTS) {
    throw createError(429, 'Too many dashboard requests. Please try again later.');
  }
}

const deviceRequests = new Map<string, RateLimitEntry>();

const DEVICE_WINDOW_MS = 60_000;
const DEVICE_MAX_REQUESTS = 20;

export async function deviceRateLimit(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user as {
    id?: string;
  };

  const key = `device:${user?.id ?? request.ip}`;
  const now = Date.now();
  const current = deviceRequests.get(key);

  if (!current || current.resetAt <= now) {
    deviceRequests.set(key, {
      count: 1,
      resetAt: now + DEVICE_WINDOW_MS,
    });

    return;
  }

  current.count += 1;

  if (current.count > DEVICE_MAX_REQUESTS) {
    throw createError(429, 'Too many device requests. Please try again later.');
  }
}

const paymentRequests = new Map<string, RateLimitEntry>();

const PAYMENT_WINDOW_MS = 60_000;
const PAYMENT_MAX_REQUESTS = 20;

export async function paymentRateLimit(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user as {
    id?: string;
  };

  const key = `payment:${user?.id ?? request.ip}`;
  const now = Date.now();
  const current = paymentRequests.get(key);

  if (!current || current.resetAt <= now) {
    paymentRequests.set(key, {
      count: 1,
      resetAt: now + PAYMENT_WINDOW_MS,
    });

    return;
  }

  current.count += 1;

  if (current.count > PAYMENT_MAX_REQUESTS) {
    throw createError(429, 'Too many payment requests. Please try again later.');
  }
}
