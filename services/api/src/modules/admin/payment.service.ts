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
    const existing = await prisma.product.findFirst({
      where: {
        code: {
          equals: item.code,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.product.create({
      data: {
        name: item.name,
        code: item.code.toUpperCase(),
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

  const catalog = products
    .filter((product) => product.active)
    .map((product) => {
      const normalizedCode = product.code.toLowerCase();
      return {
        code: product.code,
        name: product.name,
        price: Number(product.price) / 100,
        currency: product.currency,
        durationDays: product.durationDays,
        deviceLimit: product.deviceLimit,
        userLimit: 1,
        category: normalizedCode.startsWith('wg-') ? 'wireguard' : 'general',
        capacityPolicy:
          normalizedCode === 'general-free'
            ? 'Free capacity: 100 concurrent/served users within a 1-hour operating window; inactive connections are disconnected and capacity is released.'
            : normalizedCode.startsWith('wg-')
              ? 'Production WireGuard nodes with health, load, capacity and queue control.'
              : 'Production General Nodes with health, load, capacity and queue control.',
      };
    });
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

export async function createAdminProduct(data: {
  name: string;
  code: string;
  price: number;
  currency: string;
  durationDays: number;
  deviceLimit: number;
  active?: boolean;
}) {
  return prisma.product.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim(),
      price: Number(data.price),
      currency: data.currency.trim().toUpperCase(),
      durationDays: Number(data.durationDays),
      deviceLimit: Number(data.deviceLimit),
      active: data.active ?? true,
    },
    include: { prices: true },
  });
}

export async function updateAdminProductPrice(
  id: string,
  data: {
    country?: string | null;
    currency?: string;
    amount?: number;
    active?: boolean;
  },
) {
  return prisma.productPrice.update({
    where: { id },
    data: {
      ...(data.country !== undefined
        ? { country: data.country?.trim().toUpperCase() || null }
        : {}),
      ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
      ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
      ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
    },
  });
}

export async function deleteAdminProductPrice(id: string) {
  return prisma.productPrice.delete({ where: { id } });
}

export async function updateAdminPayment(
  id: string,
  data: {
    provider?: string;
    country?: string | null;
    currency?: string;
    paymentMethod?: string | null;
    amount?: number;
    settlementCurrency?: string | null;
    status?: string;
    transactionId?: string | null;
    type?: string;
    autoDebit?: boolean;
    providerPaymentId?: string | null;
    refundId?: string | null;
    refundReason?: string | null;
  },
) {
  return prisma.payment.update({
    where: { id },
    data: {
      ...(data.provider !== undefined ? { provider: data.provider.trim() } : {}),
      ...(data.country !== undefined
        ? { country: data.country?.trim().toUpperCase() || null }
        : {}),
      ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
      ...(data.paymentMethod !== undefined
        ? { paymentMethod: data.paymentMethod?.trim() || null }
        : {}),
      ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
      ...(data.settlementCurrency !== undefined
        ? { settlementCurrency: data.settlementCurrency?.trim().toUpperCase() || null }
        : {}),
      ...(data.status !== undefined ? { status: data.status.trim() } : {}),
      ...(data.transactionId !== undefined
        ? { transactionId: data.transactionId?.trim() || null }
        : {}),
      ...(data.type !== undefined ? { type: data.type.trim() } : {}),
      ...(data.autoDebit !== undefined ? { autoDebit: Boolean(data.autoDebit) } : {}),
      ...(data.providerPaymentId !== undefined
        ? { providerPaymentId: data.providerPaymentId?.trim() || null }
        : {}),
      ...(data.refundId !== undefined ? { refundId: data.refundId?.trim() || null } : {}),
      ...(data.refundReason !== undefined
        ? { refundReason: data.refundReason?.trim() || null }
        : {}),
    },
    include: { subscription: { include: { user: true, product: true } } },
  });
}

const defaultBillingTopology = {
  generalFree: {
    maxConcurrentUsers: 100,
    operatingWindowHours: 1,
    disconnectInactive: true,
    releaseCapacity: true,
    queueEnabled: true,
    routeLabel: 'Free Server',
    description:
      'Active usage/device checks, automatic disconnect of inactive connections, capacity release and queue-aware reconnection.',
  },
  generalPro: {
    target: 'Production General Nodes',
    smartVpn: true,
    smartVproxy: true,
    health: true,
    load: true,
    capacity: true,
    queue: true,
  },
  wireguard: {
    target: 'Production WireGuard Nodes',
    health: true,
    load: true,
    capacity: true,
    queue: true,
  },
};

export async function adminBillingTopology() {
  const config = await prisma.adminBillingConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', topology: defaultBillingTopology },
  });
  return config.topology;
}

export async function updateAdminBillingTopology(topology: unknown) {
  const value = topology as typeof defaultBillingTopology;
  return (
    await prisma.adminBillingConfig.upsert({
      where: { id: 'default' },
      update: { topology: value },
      create: { id: 'default', topology: value },
    })
  ).topology;
}

type FinancialBucket = {
  currency: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  expenses: number;
  profit: number;
};

function addAmount(map: Map<string, number>, currency: string, amount: number) {
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

function buildFinancialBuckets(
  payments: Array<{ amount: number; currency: string; status: string; createdAt: Date }>,
  expenses: Array<{ amount: number; currency: string; expenseDate: Date }>,
) {
  const currencies = new Set<string>();
  const gross = new Map<string, number>();
  const refunds = new Map<string, number>();
  const expenseTotals = new Map<string, number>();

  for (const payment of payments) {
    const currency = payment.currency.toUpperCase();
    currencies.add(currency);
    if (payment.status === 'success') addAmount(gross, currency, payment.amount);
    if (payment.status === 'refunded') addAmount(refunds, currency, payment.amount);
  }
  for (const expense of expenses) {
    const currency = expense.currency.toUpperCase();
    currencies.add(currency);
    addAmount(expenseTotals, currency, expense.amount);
  }

  return [...currencies].sort().map((currency): FinancialBucket => {
    const grossRevenue = gross.get(currency) ?? 0;
    const refundsAmount = refunds.get(currency) ?? 0;
    const netRevenue = grossRevenue - refundsAmount;
    const expenseAmount = expenseTotals.get(currency) ?? 0;
    return {
      currency,
      grossRevenue,
      refunds: refundsAmount,
      netRevenue,
      expenses: expenseAmount,
      profit: netRevenue - expenseAmount,
    };
  });
}

function periodKey(date: Date, period: 'day' | 'month' | 'year') {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  if (period === 'year') return String(year);
  if (period === 'month') return `${year}-${month}`;
  return date.toISOString().slice(0, 10);
}

function buildRevenueSeries(
  payments: Array<{ amount: number; currency: string; status: string; createdAt: Date }>,
  period: 'day' | 'month' | 'year',
) {
  const buckets = new Map<string, Map<string, number>>();
  for (const payment of payments) {
    if (payment.status !== 'success') continue;
    const key = periodKey(payment.createdAt, period);
    const currency = payment.currency.toUpperCase();
    if (!buckets.has(key)) buckets.set(key, new Map());
    addAmount(buckets.get(key)!, currency, payment.amount);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKeyValue, values]) => ({
      period: periodKeyValue,
      amounts: [...values.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({ currency, amount })),
    }));
}

export async function adminFinancialReport() {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      select: { amount: true, currency: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.adminFinancialExpense.findMany({
      select: {
        id: true,
        category: true,
        description: true,
        amount: true,
        currency: true,
        expenseDate: true,
        recurring: true,
        createdAt: true,
      },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    }),
  ]);

  return {
    totals: buildFinancialBuckets(payments, expenses),
    daily: buildRevenueSeries(payments, 'day'),
    monthly: buildRevenueSeries(payments, 'month'),
    yearly: buildRevenueSeries(payments, 'year'),
    expenses,
    note: 'Revenue is based on successful payments. Refunds are deducted from net revenue. Profit is net revenue minus recorded operating expenses, grouped by currency.',
  };
}

export async function createAdminFinancialExpense(data: {
  category: string;
  description?: string | null;
  amount: number;
  currency: string;
  expenseDate?: string | null;
  recurring?: boolean;
}) {
  return prisma.adminFinancialExpense.create({
    data: {
      category: data.category.trim(),
      description: data.description?.trim() || null,
      amount: Number(data.amount),
      currency: data.currency.trim().toUpperCase(),
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      recurring: Boolean(data.recurring),
    },
  });
}

export async function deleteAdminFinancialExpense(id: string) {
  return prisma.adminFinancialExpense.delete({ where: { id } });
}
