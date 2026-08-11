import type { PrismaClient } from '@prisma/client';

const userPermissions = [
  'dashboard:read',
  'subscription:read',
  'subscription:create',
  'subscription:cancel',
  'vpn:read',
  'device:read',
  'device:create',
  'device:revoke',
  'device:regenerate',
];

const adminPermissions = ['vpn-node:read', 'vpn-node:create', 'vpn-node:update'];

export async function seedPermissions(prisma: PrismaClient) {
  const userRole = await prisma.role.upsert({
    where: {
      name: 'USER',
    },
    update: {},
    create: {
      name: 'USER',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: {
      name: 'ADMIN',
    },
    update: {},
    create: {
      name: 'ADMIN',
    },
  });

  for (const name of userPermissions) {
    const permission = await prisma.permission.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const name of adminPermissions) {
    const permission = await prisma.permission.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }
}
