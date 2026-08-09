import type { FastifyRequest, FastifyReply } from 'fastify';

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

  const key = user?.id ?? request.ip;

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
