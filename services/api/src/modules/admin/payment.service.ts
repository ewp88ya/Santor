import { prisma } from '../../config/database.js';

const providerEnv: Record<string, string[]> = {
  global_card: ['GLOBAL_CARD_API_KEY'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  xendit: ['XENDIT_SECRET_KEY'],
  russia: ['PLATEGA_MERCHANT_ID', 'PLATEGA_SECRET'],
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY'],
  wechat: ['WECHAT_PAY_APP_ID', 'WECHAT_PAY_MCH_ID', 'WECHAT_PAY_API_KEY'],
};

const catalog = [
  {
    code: 'general-free',
    name: 'General Free',
    price: 0,
    currency: 'USD',
    durationDays: 3,
    deviceLimit: 1,
    userLimit: 1,
    category: 'general',
    capacityPolicy:
      '100 concurrent/served users within a 1-hour operating window; active-usage/device checks; automatic disconnect of inactive connections; reconnection subject to current capacity and queue conditions.',
  },
  {
    code: 'general-pro-1m',
    name: 'General Pro 1M',
    price: 1.99,
    currency: 'USD',
    durationDays: 30,
    deviceLimit: 3,
    userLimit: 1,
    category: 'general',
    capacityPolicy: 'Production General Nodes with health, load, capacity and queue control.',
  },
  {
    code: 'general-pro-6m',
    name: 'General Pro 6M',
    price: 9.99,
    currency: 'USD',
    durationDays: 180,
    deviceLimit: 3,
    userLimit: 1,
    category: 'general',
    capacityPolicy: 'Production General Nodes with health, load, capacity and queue control.',
  },
  {
    code: 'general-pro-12m',
    name: 'General Pro 12M',
    price: 14.99,
    currency: 'USD',
    durationDays: 365,
    deviceLimit: 3,
    userLimit: 1,
    category: 'general',
    capacityPolicy: 'Production General Nodes with health, load, capacity and queue control.',
  },
  {
    code: 'wg-1m',
    name: 'WG-1M',
    price: 4.99,
    currency: 'USD',
    durationDays: 30,
    deviceLimit: 5,
    userLimit: 1,
    category: 'wireguard',
    capacityPolicy: 'Production WireGuard nodes with health, load, capacity and queue control.',
  },
  {
    code: 'wg-3m',
    name: 'WG-3M',
    price: 12.99,
    currency: 'USD',
    durationDays: 90,
    deviceLimit: 5,
    userLimit: 1,
    category: 'wireguard',
    capacityPolicy: 'Production WireGuard nodes with health, load, capacity and queue control.',
  },
  {
    code: 'wg-6m',
    name: 'WG-6M',
    price: 22.99,
    currency: 'USD',
    durationDays: 180,
    deviceLimit: 5,
    userLimit: 1,
    category: 'wireguard',
    capacityPolicy: 'Production WireGuard nodes with health, load, capacity and queue control.',
  },
  {
    code: 'wg-12m',
    name: 'WG-12M',
    price: 39.99,
    currency: 'USD',
    durationDays: 365,
    deviceLimit: 5,
    userLimit: 1,
    category: 'wireguard',
    capacityPolicy: 'Production WireGuard nodes with health, load, capacity and queue control.',
  },
];

export async function ensureProductCatalog() {
  for (const item of catalog) {
    await prisma.product.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        price: Math.round(item.price * 100),
        currency: item.currency,
        durationDays: item.durationDays,
        deviceLimit: item.deviceLimit,
        active: true,
      },
      create: {
        name: item.name,
        code: item.code,
        price: Math.round(item.price * 100),
        currency: item.currency,
        durationDays: item.durationDays,
        deviceLimit: item.deviceLimit,
        active: true,
      },
    });
  }
  return prisma.product.findMany({ include: { prices: true }, orderBy: { createdAt: 'asc' } });
}

export async function adminPaymentOverview() {
  await ensureProductCatalog();
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

  return { payments, subscriptions, products, providerStatus, catalog };
}

export async function updateAdminProduct(
  id: string,
  data: {
    name?: string;
    code?: string;
    price?: number;
    currency?: string;
    durationDays?: number;
    deviceLimit?: number;
    active?: boolean;
  },
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

export async function createAdminProductPrice(data: {
  productId: string;
  country?: string | null;
  currency: string;
  amount: number;
  active?: boolean;
}) {
  return prisma.productPrice.upsert({
    where: {
      productId_country_currency: {
        productId: data.productId,
        country: (data.country?.trim().toUpperCase() || null) as string,
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
