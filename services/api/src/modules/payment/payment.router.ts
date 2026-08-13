import type { PaymentMethod, PaymentProvider } from './providers/payment.provider.js';

function isGlobalCard(method: PaymentMethod) {
  return method === 'VISA' || method === 'MASTERCARD';
}

function isChinaMethod(method: PaymentMethod) {
  return method === 'ALIPAY' || method === 'WECHAT_PAY';
}

function isRussiaMethod(method: PaymentMethod) {
  return method === 'SBP' || method === 'MIR' || method === 'CRYPTO';
}

export function routePaymentProvider(
  country: string,
  paymentMethod: PaymentMethod,
  providers: {
    globalCard: PaymentProvider;
    xendit: PaymentProvider;
    russia: PaymentProvider;
  },
): PaymentProvider {
  const normalizedCountry = country.toUpperCase();

  if (isGlobalCard(paymentMethod)) {
    return providers.globalCard;
  }

  if (normalizedCountry === 'CN' && isChinaMethod(paymentMethod)) {
    return providers.xendit;
  }

  if (normalizedCountry === 'RU' && isRussiaMethod(paymentMethod)) {
    return providers.russia;
  }

  return providers.xendit;
}
