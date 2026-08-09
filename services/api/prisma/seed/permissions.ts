import type { PrismaClient } from '@prisma/client';

const permissions = [
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

  for (const name of permissions) {
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
}
