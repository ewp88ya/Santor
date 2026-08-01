import { prisma } from '../../config/database.js';

export async function createPayment(data: {
  subscriptionId: string;
  provider: string;
  amount: number;
  currency: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      id: data.subscriptionId,
    },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.status === 'active') {
    throw new Error('Subscription already active');
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      subscriptionId: data.subscriptionId,
      status: 'pending',
    },
  });

  if (existingPayment) {
    return prisma.payment.findUnique({
      where: {
        id: existingPayment.id,
      },

      include: {
        subscription: {
          include: {
            product: true,
            user: true,
          },
        },
      },
    });
  }

  return prisma.payment.create({
    data: {
      subscriptionId: data.subscriptionId,
      provider: data.provider,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
    },

    include: {
      subscription: {
        include: {
          product: true,
          user: true,
        },
      },
    },
  });
}

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: {
      id,
    },

    include: {
      subscription: {
        include: {
          product: true,
          user: true,
        },
      },
    },
  });
}

export async function listPayments() {
  return prisma.payment.findMany({
    include: {
      subscription: {
        include: {
          product: true,
          user: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updatePaymentStatus(id: string, status: string, transactionId?: string) {
  const payment = await prisma.payment.findUnique({
    where: {
      id,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  return prisma.payment.update({
    where: {
      id,
    },

    data: {
      status,
      transactionId,
    },

    include: {
      subscription: {
        include: {
          product: true,
          user: true,
        },
      },
    },
  });
}
