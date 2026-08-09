import { prisma } from '../src/config/database.js';

const email = 'production-test@santor.app';

const user = await prisma.user.findUnique({
  where: {
    email,
  },
  include: {
    subscriptions: {
      include: {
        product: true,
        license: {
          include: {
            vpnAccess: true,
          },
        },
      },
    },
  },
});

console.log(JSON.stringify(user, null, 2));

process.exit();
