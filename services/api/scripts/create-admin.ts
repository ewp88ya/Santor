import argon2 from 'argon2';

import { prisma } from '../src/config/database.js';

const tenant = await prisma.tenant.findFirst({
  where: {
    name: 'Santor',
  },
});

if (!tenant) {
  throw new Error('Santor tenant not found');
}

const adminRole = await prisma.role.findUnique({
  where: {
    name: 'ADMIN',
  },
});

if (!adminRole) {
  throw new Error('ADMIN role not found');
}

const passwordHash = await argon2.hash('admin12345');

const admin = await prisma.user.upsert({
  where: {
    email: 'admin@santor.app',
  },
  update: {
    roleId: adminRole.id,
    tenantId: tenant.id,
    passwordHash,
    status: 'active',
  },
  create: {
    email: 'admin@santor.app',
    name: 'Santor Admin',
    passwordHash,
    tenantId: tenant.id,
    roleId: adminRole.id,
  },
});

console.log(
  JSON.stringify(
    {
      id: admin.id,
      email: admin.email,
      roleId: admin.roleId,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
