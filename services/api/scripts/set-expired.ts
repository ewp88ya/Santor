import { prisma } from '../src/config/database.js';

async function main() {
  await prisma.subscription.updateMany({
    where: {
      status: 'active',
    },
    data: {
      endDate: new Date('2026-07-31T11:26:09.724Z'),
    },
  });

  console.log('updated');
}

main().finally(async () => {
  await prisma.$disconnect();
});
