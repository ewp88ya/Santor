import type { FastifyInstance } from 'fastify';

const PROBE_TIMEOUT_MS = 1_000;

async function withProbeTimeout<T>(operation: () => Promise<T>, probe: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(probe + ' health probe timed out after ' + PROBE_TIMEOUT_MS + 'ms')),
          PROBE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => {
    let database = 'disconnected';
    let redis = 'disconnected';

    try {
      await withProbeTimeout(() => app.prisma.$queryRaw`SELECT 1`, 'database');
      database = 'connected';
    } catch (error) {
      app.log.error(error);
    }

    try {
      await withProbeTimeout(() => app.redis.ping(), 'redis');
      redis = 'connected';
    } catch (error) {
      app.log.error(error);
    }

    return {
      status: database === 'connected' && redis === 'connected' ? 'ok' : 'degraded',
      service: 'santor-api',
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  });
}
