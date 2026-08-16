type PaymentProviderConfig = {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookToken?: string;

  stripeSecretKey?: string;
  stripeBaseUrl?: string;

  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalBaseUrl?: string;
  paypalReturnUrl?: string;
  paypalCancelUrl?: string;

  plategaMerchantId?: string;
  plategaSecret?: string;
  plategaBaseUrl?: string;

  yookassaShopId?: string;
  yookassaSecret?: string;
  yookassaBaseUrl?: string;
  yookassaReturnUrl?: string;

  cloudPaymentsPublicId?: string;
  cloudPaymentsApiSecret?: string;
  cloudPaymentsBaseUrl?: string;
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

  stripe: {
    enabled: getBooleanEnv('STRIPE_ENABLED'),
    stripeSecretKey: getOptionalEnv('STRIPE_SECRET_KEY'),
    stripeBaseUrl: getOptionalEnv('STRIPE_BASE_URL') ?? 'https://api.stripe.com',
  } satisfies PaymentProviderConfig,

  paypal: {
    enabled: getBooleanEnv('PAYPAL_ENABLED'),
    paypalClientId: getOptionalEnv('PAYPAL_CLIENT_ID'),
    paypalClientSecret: getOptionalEnv('PAYPAL_CLIENT_SECRET'),
    paypalBaseUrl: getOptionalEnv('PAYPAL_BASE_URL') ?? 'https://api-m.paypal.com',
    paypalReturnUrl:
      getOptionalEnv('PAYPAL_RETURN_URL') ?? 'https://santor.app/payment/paypal/return',
    paypalCancelUrl:
      getOptionalEnv('PAYPAL_CANCEL_URL') ?? 'https://santor.app/payment/paypal/cancel',
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

    yookassaShopId: getOptionalEnv('YOOKASSA_SHOP_ID'),
    yookassaSecret: getOptionalEnv('YOOKASSA_SECRET'),
    yookassaBaseUrl: getOptionalEnv('YOOKASSA_BASE_URL') ?? 'https://api.yookassa.ru',
    yookassaReturnUrl: getOptionalEnv('YOOKASSA_RETURN_URL') ?? 'https://santor.app/payment/return',

    cloudPaymentsPublicId: getOptionalEnv('CLOUDPAYMENTS_PUBLIC_ID'),
    cloudPaymentsApiSecret: getOptionalEnv('CLOUDPAYMENTS_API_SECRET'),
    cloudPaymentsBaseUrl:
      getOptionalEnv('CLOUDPAYMENTS_BASE_URL') ?? 'https://api.cloudpayments.ru',
  } satisfies PaymentProviderConfig,
} as const;
