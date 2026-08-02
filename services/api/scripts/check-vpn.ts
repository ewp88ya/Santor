import { prisma } from '../src/config/database.js';

const vpn = await prisma.vPNAccess.findUnique({
  where: {
    id: '4a4b4dda-0412-455d-bd4f-9cadab9c326a',
  },
  include: {
    license: {
      include: {
        subscription: {
          include: {
            user: true,
          },
        },
      },
    },
  },
});

console.log(JSON.stringify(vpn, null, 2));

process.exit();
