import { prisma } from '../../config/database.js';

const providerEnv: Record<string, string[]> = {
  global_card: ['GLOBAL_CARD_API_KEY'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  xendit: ['XENDIT_SECRET_KEY'],
  russia: ['PLATEGA_MERCHANT_ID', 'PLATEGA_SECRET'],
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY'],
  wechat: ['WECHAT_PAY_APP_ID', 'WECHAT_PAY_MCH_ID', 'WECHAT_PAY_API_KEY'],
};

export async function adminPaymentOverview() {
  const [payments, subscriptions, products] = await Promise.all([
    prisma.payment.findMany({
      include: { subscription: { include: { user: true, product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.subscription.findMany({
      include: { user: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.product.findMany({
      include: { prices: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const providerStatus = Object.entries(providerEnv).map(([name, keys]) => ({
    name,
    configured: keys.every((key) => Boolean(process.env[key]?.trim())),
  }));

  return { payments, subscriptions, products, providerStatus };
}

export async function updateAdminProduct(
  id: string,
  data: { name?: string; code?: string; price?: number; currency?: string; durationDays?: number; deviceLimit?: number; active?: boolean },
) {
  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.code !== undefined ? { code: data.code.trim() } : {}),
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
      ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
      ...(data.durationDays !== undefined ? { durationDays: Number(data.durationDays) } : {}),
      ...(data.deviceLimit !== undefined ? { deviceLimit: Number(data.deviceLimit) } : {}),
      ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
    },
    include: { prices: true },
  });
}

export async function createAdminProductPrice(
  data: { productId: string; country?: string | null; currency: string; amount: number; active?: boolean },
) {
  return prisma.productPrice.upsert({
    where: {
      productId_country_currency: {
        productId: data.productId,
        country: data.country?.trim().toUpperCase() || null,
        currency: data.currency.trim().toUpperCase(),
      },
    },
    update: { amount: Number(data.amount), active: data.active ?? true },
    create: {
      productId: data.productId,
      country: data.country?.trim().toUpperCase() || null,
      currency: data.currency.trim().toUpperCase(),
      amount: Number(data.amount),
      active: data.active ?? true,
    },
  });
}
 
