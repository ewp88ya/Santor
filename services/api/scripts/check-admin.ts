import { prisma } from '../src/config/database.js';

const admins = await prisma.user.findMany({
  where: {
    role: {
      name: 'ADMIN',
    },
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: {
      select: {
        name: true,
      },
    },
  },
});

console.log(JSON.stringify(admins, null, 2));

await prisma.$disconnect();
