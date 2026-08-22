import { prisma } from '../../config/database.js';

const paymentInclude = {
  subscription: {
    include: {
      product: true,
      user: true,
    },
  },
} as const;

type TransactionClient = Parameters<typeof prisma.$transaction>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

export async function findProductPrice(productId: string, country: string, currency: string) {
  const normalizedCountry = country.trim().toUpperCase();
  const normalizedCurrency = currency.trim().toUpperCase();

  return prisma.productPrice.findFirst({
    where: {
      productId,
      currency: normalizedCurrency,
      active: true,
      OR: [
        {
          country: normalizedCountry,
        },
        {
          country: null,
        },
      ],
    },
    orderBy: [
      {
        country: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });
}

export async function createPayment(data: {
  subscriptionId: string;
  provider: string;
  country: string;
  currency: string;
  paymentMethod: string;
  settlementCurrency?: string;
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

  const normalizedCountry = data.country.trim().toUpperCase();
  const normalizedCurrency = data.currency.trim().toUpperCase();

  const price = await findProductPrice(
    subscription.productId,
    normalizedCountry,
    normalizedCurrency,
  );

  if (!price) {
    throw new Error(`No active price found for ${normalizedCountry}/${normalizedCurrency}`);
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
      country: normalizedCountry,
      currency: price.currency,
      paymentMethod: data.paymentMethod,
      amount: price.amount,
      settlementCurrency: data.settlementCurrency,
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

export async function findLatestSuccessfulPaymentForSubscription(subscriptionId: string) {
  return prisma.payment.findFirst({
    where: {
      subscriptionId,
      status: 'success',
      country: {
        not: null,
      },
      paymentMethod: {
        not: null,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updatePaymentProvider(
  id: string,
  data: {
    providerPaymentId?: string;
    transactionId?: string;
    settlementCurrency?: string;
  },
) {
  return prisma.payment.update({
    where: {
      id,
    },
    data: {
      providerPaymentId: data.providerPaymentId,
      transactionId: data.transactionId,
      settlementCurrency: data.settlementCurrency,
    },
    include: paymentInclude,
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

export async function transitionPaymentFromWebhook(
  data: {
    paymentId: string;
    status: 'success' | 'failed';
    transactionId?: string;
    webhookEventId: string;
  },
  tx: TransactionClient,
) {
  const payment = await tx.payment.findUnique({
    where: {
      id: data.paymentId,
    },
    include: {
      subscription: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.webhookEventId === data.webhookEventId) {
    return {
      processed: false,
      duplicate: true,
      transitioned: false,
      payment,
    };
  }

  if (payment.status !== 'pending') {
    return {
      processed: true,
      duplicate: false,
      transitioned: false,
      payment,
    };
  }

  const updated = await tx.payment.updateMany({
    where: {
      id: data.paymentId,
      status: 'pending',
      OR: [
        {
          webhookEventId: null,
        },
        {
          webhookEventId: {
            not: data.webhookEventId,
          },
        },
      ],
    },
    data: {
      status: data.status,
      transactionId: data.transactionId,
      webhookEventId: data.webhookEventId,
    },
  });

  if (updated.count === 0) {
    const current = await tx.payment.findUnique({
      where: {
        id: data.paymentId,
      },
      include: {
        subscription: true,
      },
    });

    if (!current) {
      throw new Error('Payment not found');
    }

    return {
      processed: true,
      duplicate: current.webhookEventId === data.webhookEventId,
      transitioned: false,
      payment: current,
    };
  }

  const refreshed = await tx.payment.findUnique({
    where: {
      id: data.paymentId,
    },
    include: {
      subscription: true,
    },
  });

  if (!refreshed) {
    throw new Error('Payment not found after webhook transition');
  }

  return {
    processed: true,
    duplicate: false,
    transitioned: true,
    payment: refreshed,
  };
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
