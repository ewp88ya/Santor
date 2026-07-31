import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

export default fp(async (app) => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
