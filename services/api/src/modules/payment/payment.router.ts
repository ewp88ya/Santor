import type { PaymentMethod, PaymentProvider } from './providers/payment.provider.js';

type PaymentProviders = {
  globalCard: PaymentProvider;
  paypal: PaymentProvider;
  xendit: PaymentProvider;
  russia: PaymentProvider;
};

const ASEAN_CURRENCIES = new Set([
  'IDR',
  'MYR',
  'THB',
  'PHP',
  'VND',
  'SGD',
  'LAK',
  'KHR',
]);

const ASEAN_COUNTRIES = new Set([
  'ID',
  'MY',
  'TH',
  'PH',
  'VN',
  'SG',
  'LA',
  'KH',
]);

function isGlobalCard(method: PaymentMethod) {
  return method === 'VISA' || method === 'MASTERCARD';
}

function isPayPal(method: PaymentMethod) {
  return method === 'PAYPAL';
}

function isChinaMethod(method: PaymentMethod) {
  return method === 'ALIPAY' || method === 'WECHAT_PAY';
}

function isRussiaMethod(method: PaymentMethod) {
  return method === 'SBP' || method === 'MIR' || method === 'CRYPTO';
}

function isAseanCountry(country: string) {
  return ASEAN_COUNTRIES.has(country);
}

function isAseanCurrency(currency: string) {
  return ASEAN_CURRENCIES.has(currency);
}

function isAseanPayment(
  country: string,
  currency: string,
  paymentMethod: PaymentMethod,
) {
  if (!isAseanCountry(country)) {
    return false;
  }

  if (!isAseanCurrency(currency)) {
    return false;
  }

  return (
    paymentMethod === 'QRIS' ||
    paymentMethod === 'VISA' ||
    paymentMethod === 'MASTERCARD'
  );
}

export function routePaymentProvider(
  country: string,
  paymentMethod: PaymentMethod,
  providers: PaymentProviders,
  currency = '',
): PaymentProvider {
  const normalizedCountry = country.trim().toUpperCase();
  const normalizedCurrency = currency.trim().toUpperCase();

  if (isGlobalCard(paymentMethod)) {
    return providers.globalCard;
  }

  if (isPayPal(paymentMethod)) {
    return providers.paypal;
  }

  if (normalizedCountry === 'CN' && isChinaMethod(paymentMethod)) {
    return providers.xendit;
  }

  if (normalizedCountry === 'RU' && isRussiaMethod(paymentMethod)) {
    return providers.russia;
  }

  if (
    isAseanPayment(
      normalizedCountry,
      normalizedCurrency,
      paymentMethod,
    )
  ) {
    return providers.xendit;
  }

  return providers.xendit;
}
