import { prisma } from '../../config/database.js';

export async function createSubscription(data: { userId: string; productId: string }) {
  return prisma.subscription.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      status: 'pending',
    },

    include: {
      product: true,
      user: true,
    },
  });
}

export async function findSubscriptionById(id: string) {
  return prisma.subscription.findUnique({
    where: {
      id,
    },

    include: {
      product: true,
      user: true,
      payments: true,
      license: true,
    },
  });
}

export async function findUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
    },

    include: {
      product: true,
      payments: true,
      license: true,
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}
