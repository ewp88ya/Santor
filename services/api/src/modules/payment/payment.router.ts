import type { PaymentMethod, PaymentProvider } from './providers/payment.provider.js';

type PaymentProviders = {
  globalCard: PaymentProvider;
  paypal: PaymentProvider;
  xendit: PaymentProvider;
  russia: PaymentProvider;
  alipay: PaymentProvider;
  wechat: PaymentProvider;
};

const ASEAN_CURRENCIES = new Set(['IDR', 'MYR', 'THB', 'PHP', 'VND', 'SGD', 'LAK', 'KHR']);
const ASEAN_COUNTRIES = new Set(['ID', 'MY', 'TH', 'PH', 'VN', 'SG', 'LA', 'KH']);

function isGlobalCard(method: PaymentMethod) {
  return method === 'VISA' || method === 'MASTERCARD';
}

function isPayPal(method: PaymentMethod) {
  return method === 'PAYPAL';
}

function isRussiaMethod(method: PaymentMethod) {
  return method === 'SBP' || method === 'MIR' || method === 'CRYPTO';
}

function isAseanPayment(country: string, currency: string, paymentMethod: PaymentMethod) {
  return (
    ASEAN_COUNTRIES.has(country) &&
    ASEAN_CURRENCIES.has(currency) &&
    (paymentMethod === 'QRIS' || paymentMethod === 'VISA' || paymentMethod === 'MASTERCARD')
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

  if (isGlobalCard(paymentMethod)) return providers.globalCard;
  if (isPayPal(paymentMethod)) return providers.paypal;

  if (normalizedCountry === 'CN' && paymentMethod === 'ALIPAY') {
    return providers.alipay;
  }

  if (normalizedCountry === 'CN' && paymentMethod === 'WECHAT_PAY') {
    return providers.wechat;
  }

  if (normalizedCountry === 'RU' && isRussiaMethod(paymentMethod)) {
    return providers.russia;
  }

  if (isAseanPayment(normalizedCountry, normalizedCurrency, paymentMethod)) {
    return providers.xendit;
  }

  throw new Error(
    `Unsupported payment route: country=${normalizedCountry}, currency=${normalizedCurrency || 'unknown'}, method=${paymentMethod}`,
  );
}
