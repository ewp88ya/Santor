import { prisma } from '../../config/database.js';

const paymentInclude = {
  subscription: {
    include: {
      product: true,
      user: true,
    },
  },
} as const;

export async function createPayment(data: {
  subscriptionId: string;
  provider: string;
  amount: number;
  currency: string;
  type?: string;
  autoDebit?: boolean;
  providerPaymentId?: string;
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
    return findPaymentById(existingPayment.id);
  }

  return prisma.payment.create({
    data: {
      subscriptionId: data.subscriptionId,
      provider: data.provider,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      type: data.type ?? 'one_time',
      autoDebit: data.autoDebit ?? false,
      providerPaymentId: data.providerPaymentId,
    },
    include: paymentInclude,
  });
}

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentInclude,
  });
}

export async function findPaymentByIdForUser(id: string, userId: string) {
  return prisma.payment.findFirst({
    where: {
      id,
      subscription: {
        userId,
      },
    },
    include: paymentInclude,
  });
}

export async function listPayments(userId: string) {
  return prisma.payment.findMany({
    where: {
      subscription: {
        userId,
      },
    },
    include: paymentInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updatePaymentStatus(id: string, status: string, transactionId?: string) {
  return prisma.payment.update({
    where: {
      id,
    },
    data: {
      status,
      transactionId,
    },
    include: paymentInclude,
  });
}

export async function updateSubscriptionAutoDebit(
  subscriptionId: string,
  userId: string,
  data: {
    enabled: boolean;
    customerId?: string;
    paymentMethodId?: string;
  },
) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
    },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  return prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      autoDebitEnabled: data.enabled,
      paymentCustomerId: data.customerId,
      paymentMethodId: data.paymentMethodId,
    },
  });
}
