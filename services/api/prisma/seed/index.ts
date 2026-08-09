import type { PrismaClient } from '@prisma/client';
import { seedUsers } from './users.js';
import { seedPermissions } from './permissions.js';

export async function runSeed(prisma: PrismaClient) {
  await seedPermissions(prisma);
  await seedUsers(prisma);
}
