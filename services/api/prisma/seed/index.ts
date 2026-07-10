import type { PrismaClient } from "@prisma/client";
import { seedUsers } from "./users.js";

export async function runSeed(prisma: PrismaClient) {
  await seedUsers(prisma);
}
