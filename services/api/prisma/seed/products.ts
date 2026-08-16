import type { PrismaClient } from '@prisma/client';

export async function seedProducts(prisma: PrismaClient) {
  console.log('=================================');
  console.log('🌱 Seeding products...');
  console.log('=================================');

  const products = [
    {
      name: 'General Free',
      code: 'GENERAL-FREE',
      price: 0,
      currency: 'USD',
      durationDays: 3,
      deviceLimit: 1,
    },
    {
      name: 'General Pro 1 Month',
      code: 'GENERAL-PRO-1M',
      price: 199,
      currency: 'USD',
      durationDays: 30,
      deviceLimit: 3,
    },
    {
      name: 'General Pro 6 Months',
      code: 'GENERAL-PRO-6M',
      price: 999,
      currency: 'USD',
      durationDays: 180,
      deviceLimit: 3,
    },
    {
      name: 'General Pro 12 Months',
      code: 'GENERAL-PRO-12M',
      price: 1499,
      currency: 'USD',
      durationDays: 365,
      deviceLimit: 3,
    },
    {
      name: 'WireGuard 1 Month',
      code: 'WG-1M',
      price: 499,
      currency: 'USD',
      durationDays: 30,
      deviceLimit: 5,
    },
    {
      name: 'WireGuard 3 Months',
      code: 'WG-3M',
      price: 1299,
      currency: 'USD',
      durationDays: 90,
      deviceLimit: 5,
    },
    {
      name: 'WireGuard 6 Months',
      code: 'WG-6M',
      price: 2299,
      currency: 'USD',
      durationDays: 180,
      deviceLimit: 5,
    },
    {
      name: 'WireGuard 12 Months',
      code: 'WG-12M',
      price: 3999,
      currency: 'USD',
      durationDays: 365,
      deviceLimit: 5,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        code: product.code,
      },
      update: {
        name: product.name,
        price: product.price,
        currency: product.currency,
        durationDays: product.durationDays,
        deviceLimit: product.deviceLimit,
        active: true,
      },
      create: {
        ...product,
        active: true,
      },
    });
  }

  await prisma.product.updateMany({
    where: {
      code: 'GENERAL-PRO',
    },
    data: {
      active: false,
    },
  });

  console.log('✓ Products seed completed');
}
