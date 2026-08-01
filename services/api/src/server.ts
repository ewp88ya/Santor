import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import { registerRoutes } from './routes/index.js';

export async function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error: any, request, reply) => {
    reply.status(error.statusCode ?? 500).send({
      success: false,

      error: {
        code: error.code ?? 'INTERNAL_ERROR',

        message: error.message ?? 'Internal Server Error',
      },
    });
  });

  await app.register(cors);

  await app.register(prismaPlugin);

  await app.register(redisPlugin);

  await registerRoutes(app);

  console.log(app.printRoutes());

  return app;
}
