import type { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

export async function seedUsers(prisma: PrismaClient) {
  console.log('=================================');
  console.log('🌱 Seeding users...');
  console.log('=================================');

  let tenant = await prisma.tenant.findFirst({
    where: {
      name: 'Santor',
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Santor',
      },
    });
  }

  let role = await prisma.role.findFirst({
    where: {
      name: 'USER',
    },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'USER',
      },
    });
  }

  const passwordHash = await argon2.hash('password123');

  const user = await prisma.user.upsert({
    where: {
      email: 'demo@santor.app',
    },

    update: {},

    create: {
      email: 'demo@santor.app',
      name: 'Demo User',
      passwordHash,
      tenantId: tenant.id,
      roleId: role.id,
    },
  });

  console.log('✓ User:', user.email);
  console.log('✓ Users seed completed');
}
