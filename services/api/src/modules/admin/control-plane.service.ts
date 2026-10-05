import createError from 'http-errors';
import { prisma } from '../../config/database.js';

const CONFIG_ID = 'default';

const defaultConfig = {
  service: {
    maintenanceMode: false,
    registrationEnabled: true,
    customerLoginEnabled: true,
    defaultCurrency: 'USD',
    sessionHours: 24,
    timezone: 'UTC',
  },
  ai: {
    enabled: true,
    provider: 'ollama',
    model: 'llama3.1',
    baseUrl: 'http://ollama:11434',
    temperature: 0.2,
    maxTokens: 2048,
  },
  telegram: {
    enabled: true,
    botUsername: '',
    webhookPath: '/api/v1/telegram/webhook',
    requireLinkedAccount: true,
  },
  features: {
    vpn: true,
    wireguard: true,
    xray: true,
    ai: true,
    telegram: true,
    customerDashboard: true,
    downloads: true,
    autoProvisioning: true,
  },
  customer: {
    dashboardTitle: 'Santor',
    showConnectionStatus: true,
    showUsage: true,
    allowDeviceRename: true,
    allowProfileRegeneration: true,
  },
  monitoring: {
    enabled: true,
    healthIntervalSeconds: 30,
    alertingEnabled: true,
    logRetentionDays: 30,
  },
  deployment: {
    mode: 'manual',
    autoDeployEnabled: false,
    maintenanceWindow: '02:00-04:00 UTC',
    restartPolicy: 'on-failure',
    note: 'Deployment controls are prepared for agent-based execution; credentials remain outside the admin database.',
  },
  providers: [
    {
      id: 'global-card',
      name: 'GlobalCard',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'GLOBALCARD_API_KEY',
      region: 'global',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'PAYPAL_CLIENT_ID',
      region: 'global',
    },
    {
      id: 'xendit',
      name: 'Xendit',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'XENDIT_API_KEY',
      region: 'id',
    },
    {
      id: 'russia-payment',
      name: 'RussiaPayment',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'RUSSIA_PAYMENT_API_KEY',
      region: 'ru',
    },
    {
      id: 'alipay',
      name: 'Alipay',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'ALIPAY_APP_ID',
      region: 'cn',
    },
    {
      id: 'wechatpay',
      name: 'WeChatPay',
      kind: 'payment',
      enabled: true,
      credentialEnv: 'WECHATPAY_APP_ID',
      region: 'cn',
    },
    {
      id: 'hostinger-asia',
      name: 'Hostinger Asia VPN',
      kind: 'vpn',
      enabled: true,
      credentialEnv: 'HOSTINGER_API_TOKEN',
      region: 'asia',
    },
  ],
};

function mergeDefaults(value: any) {
  return {
    ...defaultConfig,
    ...value,
    service: { ...defaultConfig.service, ...(value?.service ?? {}) },
    ai: { ...defaultConfig.ai, ...(value?.ai ?? {}) },
    telegram: { ...defaultConfig.telegram, ...(value?.telegram ?? {}) },
    features: { ...defaultConfig.features, ...(value?.features ?? {}) },
    customer: { ...defaultConfig.customer, ...(value?.customer ?? {}) },
    monitoring: { ...defaultConfig.monitoring, ...(value?.monitoring ?? {}) },
    deployment: { ...defaultConfig.deployment, ...(value?.deployment ?? {}) },
    providers: Array.isArray(value?.providers) ? value.providers : defaultConfig.providers,
  };
}

function status() {
  const env = (name: string) => Boolean(process.env[name]?.trim());
  return {
    api: true,
    database: true,
    redis: env('REDIS_URL'),
    ai: env('AI_PROVIDER') || env('OLLAMA_BASE_URL'),
    telegram: env('TELEGRAM_BOT_TOKEN'),
    payments: {
      GlobalCard: env('GLOBALCARD_API_KEY'),
      PayPal: env('PAYPAL_CLIENT_ID'),
      Xendit: env('XENDIT_API_KEY'),
      RussiaPayment: env('RUSSIA_PAYMENT_API_KEY'),
      Alipay: env('ALIPAY_APP_ID'),
      WeChatPay: env('WECHATPAY_APP_ID'),
    },
  };
}

export async function getAdminControlPlane() {
  const config = await prisma.adminControlConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID, config: defaultConfig },
  });
  return { config: mergeDefaults(config.config), status: status() };
}

export async function updateAdminControlPlane(input: unknown) {
  if (!input || typeof input !== 'object')
    throw createError(400, 'Invalid control plane configuration');
  const config = mergeDefaults(input);
  const providers = config.providers.map((provider: any) => ({
    id: String(provider.id),
    name: String(provider.name),
    kind: String(provider.kind),
    enabled: Boolean(provider.enabled),
    credentialEnv: String(provider.credentialEnv),
    region: String(provider.region),
  }));
  config.providers = providers;
  const saved = await prisma.adminControlConfig.upsert({
    where: { id: CONFIG_ID },
    update: { config },
    create: { id: CONFIG_ID, config },
  });
  return { config: mergeDefaults(saved.config), status: status() };
}
