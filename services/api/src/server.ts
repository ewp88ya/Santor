import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import { registerRoutes } from './routes/index.js';
import { env } from './config/env.js';

export async function createApp() {
  const app = Fastify({ logger: true });
  const configuredOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);

  if (env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }

  app.setErrorHandler((error: any, request, reply) => {
    reply.status(error.statusCode ?? 500).send({ success: false, error: { code: error.code ?? 'INTERNAL_ERROR', message: error.message ?? 'Internal Server Error' } });
  });

  await app.register(cors, { origin: env.NODE_ENV === 'production' ? configuredOrigins : true, credentials: true });
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await registerRoutes(app);
  console.log(app.printRoutes());
  return app;
}
