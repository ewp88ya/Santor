import type { PrismaClient } from "@prisma/client";

export async function seedUsers(prisma: PrismaClient) {
  void prisma;  

  console.log("=================================");
  console.log("🌱 Seeding users...");
  console.log("=================================");
  
  /*
   * Auth belum dibuat.
   * Setelah Auth selesai, di sini akan dibuat:
   *
   * - Default Tenant
   * - Super Admin Role
   * - Permission
   * - Super Admin User
   */

  console.log("✓ Users seed completed");
}
