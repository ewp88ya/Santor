import { prisma } from '../src/config/database.js';

const products = await prisma.product.findMany({
  orderBy: {
    code: 'asc',
  },
  select: {
    code: true,
    name: true,
    deviceLimit: true,
    durationDays: true,
    active: true,
  },
});

console.log(JSON.stringify(products, null, 2));

await prisma.$disconnect();
