import { prisma } from '../../config/database.js';

export async function getUserDashboard(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      subscriptions: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          product: true,
          license: {
            include: {
              vpnAccess: {
                include: {
                  vpnNode: true,
                  devices: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
