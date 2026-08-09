import { prisma } from '../src/config/database.js';

async function main() {
  const rows = await prisma.device.findMany({
    select: {
      id: true,
      name: true,
      vpnAccessId: true,
      active: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
