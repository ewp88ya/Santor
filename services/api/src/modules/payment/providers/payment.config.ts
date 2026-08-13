type PaymentProviderConfig = {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookToken?: string;
  plategaMerchantId?: string;
  plategaSecret?: string;
  plategaBaseUrl?: string;
};

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function getBooleanEnv(name: string, defaultValue = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

export const paymentConfig = {
  globalCard: {
    enabled: getBooleanEnv('GLOBAL_CARD_ENABLED'),
    apiKey: getOptionalEnv('GLOBAL_CARD_API_KEY'),
    apiSecret: getOptionalEnv('GLOBAL_CARD_API_SECRET'),
    baseUrl: getOptionalEnv('GLOBAL_CARD_BASE_URL'),
  } satisfies PaymentProviderConfig,

  xendit: {
    enabled: getBooleanEnv('XENDIT_ENABLED'),
    apiKey: getOptionalEnv('XENDIT_API_KEY'),
    apiSecret: getOptionalEnv('XENDIT_API_SECRET'),
    baseUrl: getOptionalEnv('XENDIT_BASE_URL') ?? 'https://api.xendit.co',
    webhookToken: getOptionalEnv('XENDIT_WEBHOOK_TOKEN'),
  } satisfies PaymentProviderConfig,

  russia: {
    enabled: getBooleanEnv('RUSSIA_PAYMENT_ENABLED'),
    apiKey: getOptionalEnv('RUSSIA_PAYMENT_API_KEY'),
    apiSecret: getOptionalEnv('RUSSIA_PAYMENT_API_SECRET'),
    baseUrl: getOptionalEnv('RUSSIA_PAYMENT_BASE_URL'),
    plategaMerchantId: getOptionalEnv('PLATEGA_MERCHANT_ID'),
    plategaSecret: getOptionalEnv('PLATEGA_SECRET'),
    plategaBaseUrl: getOptionalEnv('PLATEGA_BASE_URL') ?? 'https://app.platega.io',
  } satisfies PaymentProviderConfig,
} as const;
