import { prisma } from '../src/config/database.js';

async function main() {
  const rows = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log(JSON.stringify(rows, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
