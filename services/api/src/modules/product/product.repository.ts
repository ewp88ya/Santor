import { prisma } from '../../config/database.js';

export async function findActiveProducts() {
  return prisma.product.findMany({
    where: {
      active: true,
    },
    orderBy: {
      price: 'asc',
    },
  });
}

export async function findProductById(id: string) {
  return prisma.product.findUnique({
    where: {
      id,
    },
  });
}
