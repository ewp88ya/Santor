import { prisma } from '../../config/database.js';

export async function adminCustomers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      role: { select: { name: true } },
      telegramIdentity: { select: { telegramUserId: true, username: true, linkedAt: true } },
      subscriptions: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          autoDebitEnabled: true,
          product: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateAdminCustomer(id: string, input: any) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name?.trim() || null } : {}),
      ...(input.email !== undefined ? { email: String(input.email).trim().toLowerCase() } : {}),
      ...(input.status !== undefined ? { status: String(input.status).trim() } : {}),
      ...(input.emailVerified !== undefined ? { emailVerified: Boolean(input.emailVerified) } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      role: { select: { name: true } },
      telegramIdentity: { select: { telegramUserId: true, username: true, linkedAt: true } },
      subscriptions: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          autoDebitEnabled: true,
          product: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function updateAdminSubscription(id: string, input: any) {
  return prisma.subscription.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: String(input.status).trim() } : {}),
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(input.startDate) : null }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
      ...(input.autoDebitEnabled !== undefined
        ? { autoDebitEnabled: Boolean(input.autoDebitEnabled) }
        : {}),
      ...(input.productId !== undefined ? { productId: String(input.productId) } : {}),
    },
    include: { user: true, product: true },
  });
}
