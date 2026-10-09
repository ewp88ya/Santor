import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import healthRoute from './health.js';

async function createHealthApp(
  databaseProbe: () => Promise<unknown>,
  redisProbe: () => Promise<unknown>,
) {
  const app = Fastify();
  app.decorate('prisma', { $queryRaw: databaseProbe } as unknown as FastifyInstance['prisma']);
  app.decorate('redis', { ping: redisProbe } as unknown as FastifyInstance['redis']);
  await app.register(healthRoute);
  return app;
}

describe('API health endpoint', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('reports healthy only when PostgreSQL and Redis respond', async () => {
    app = await createHealthApp(
      vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      vi.fn().mockResolvedValue('PONG'),
    );

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'santor-api',
      database: 'connected',
      redis: 'connected',
    });
  });

  it('reports degraded when a dependency rejects', async () => {
    app = await createHealthApp(
      vi.fn().mockRejectedValue(new Error('database unavailable')),
      vi.fn().mockResolvedValue('PONG'),
    );

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.json()).toMatchObject({
      status: 'degraded',
      database: 'disconnected',
      redis: 'connected',
    });
  });

  it('returns within a bounded time when PostgreSQL hangs', async () => {
    app = await createHealthApp(
      () => new Promise<never>(() => {}),
      vi.fn().mockResolvedValue('PONG'),
    );

    const startedAt = Date.now();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(Date.now() - startedAt).toBeLessThan(2_500);
    expect(response.json()).toMatchObject({
      status: 'degraded',
      database: 'disconnected',
      redis: 'connected',
    });
  }, 4_000);
});
