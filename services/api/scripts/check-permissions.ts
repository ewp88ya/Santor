import { prisma } from '../src/config/database.js';

async function main() {
  const permissions = await prisma.permission.findMany({
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(JSON.stringify(permissions, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
