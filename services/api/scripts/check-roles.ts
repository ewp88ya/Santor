import { prisma } from '../src/config/database.js';

const roles = await prisma.role.findMany({
  include: {
    permissions: {
      include: {
        permission: true,
      },
    },
  },
  orderBy: {
    name: 'asc',
  },
});

for (const role of roles) {
  console.log(`\n${role.name}`);
  for (const item of role.permissions) {
    console.log(`  - ${item.permission.name}`);
  }
}

await prisma.$disconnect();
