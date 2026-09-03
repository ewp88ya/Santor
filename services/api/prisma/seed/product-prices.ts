import type { PrismaClient } from '@prisma/client';

export async function seedProductPrices(prisma: PrismaClient) {
  console.log('=================================');
  console.log('🌱 Seeding product prices...');
  console.log('=================================');

  const products = await prisma.product.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      code: true,
      price: true,
      currency: true,
    },
  });

  for (const product of products) {
    await prisma.productPrice.upsert({
      where: {
        productId_country_currency: {
          productId: product.id,
          country: 'US',
          currency: product.currency.toUpperCase(),
        },
      },
      update: {
        amount: product.price,
        active: true,
      },
      create: {
        productId: product.id,
        country: 'US',
        currency: product.currency.toUpperCase(),
        amount: product.price,
        active: true,
      },
    });
  }

  console.log(`✓ Product prices seed completed (${products.length} products)`);
}
