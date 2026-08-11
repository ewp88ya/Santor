import { prisma } from '../src/config/database.js';

const nodes = await prisma.vPNNode.findMany({
  orderBy: {
    createdAt: 'asc',
  },
});

console.log(JSON.stringify(nodes, null, 2));

await prisma.$disconnect();
