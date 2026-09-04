import 'dotenv/config';

import { refundExternalPayment } from '../src/modules/payment/payment.refund.provider.js';

type ProviderName = 'GlobalCardAdapter' | 'PayPalAdapter' | 'XenditAdapter' | 'RussiaPaymentAdapter';

const provider = process.env.REFUND_PROVIDER as ProviderName | undefined;
const providerPaymentId = process.env.REFUND_PROVIDER_PAYMENT_ID?.trim();
const transactionId = process.env.REFUND_TRANSACTION_ID?.trim();
const amount = Number(process.env.REFUND_AMOUNT);
const currency = process.env.REFUND_CURRENCY?.trim().toUpperCase();
const refundId = process.env.REFUND_ID?.trim();
const paymentMethod = process.env.REFUND_PAYMENT_METHOD?.trim();
const reason = process.env.REFUND_REASON?.trim();
const allowProduction = process.env.ALLOW_PRODUCTION_REFUND === 'YES';

const providerBaseUrls: Record<ProviderName, string> = {
  GlobalCardAdapter: process.env.STRIPE_BASE_URL?.trim() || 'https://api.stripe.com',
  PayPalAdapter: process.env.PAYPAL_BASE_URL?.trim() || 'https://api-m.paypal.com',
  XenditAdapter: process.env.XENDIT_BASE_URL?.trim() || 'https://api.xendit.co',
  RussiaPaymentAdapter:
    process.env.REFUND_RUSSIA_BASE_URL?.trim() ||
    process.env.YOOKASSA_BASE_URL?.trim() ||
    process.env.CLOUDPAYMENTS_BASE_URL?.trim() ||
    'https://api.yookassa.ru',
};

const productionHostPatterns = [
  /(^|\.)stripe\.com$/i,
  /(^|\.)paypal\.com$/i,
  /(^|\.)xendit\.co$/i,
  /(^|\.)yookassa\.ru$/i,
  /(^|\.)cloudpayments\.ru$/i,
];

function validateRequired(name: string, value: string | undefined): asserts value is string {
  if (!value) throw new Error(`${name} is required`);
}

function assertSafeTarget(providerName: ProviderName): void {
  if (allowProduction) return;

  const baseUrl = providerBaseUrls[providerName];
  const hostname = new URL(baseUrl).hostname;

  if (productionHostPatterns.some((pattern) => pattern.test(hostname))) {
    throw new Error(
      `Production provider target detected at ${baseUrl}. Set ALLOW_PRODUCTION_REFUND=YES only after explicit approval for the authorized test refund.`,
    );
  }
}

async function main(): Promise<void> {
  validateRequired('REFUND_PROVIDER', provider);
  validateRequired('REFUND_PROVIDER_PAYMENT_ID', providerPaymentId);
  validateRequired('REFUND_CURRENCY', currency);
  validateRequired('REFUND_ID', refundId);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('REFUND_AMOUNT must be a positive finite number');
  }

  if (!['GlobalCardAdapter', 'PayPalAdapter', 'XenditAdapter', 'RussiaPaymentAdapter'].includes(provider)) {
    throw new Error(`Unsupported REFUND_PROVIDER: ${provider}`);
  }

  assertSafeTarget(provider);

  const result = await refundExternalPayment({
    provider,
    providerPaymentId,
    transactionId,
    amount,
    currency,
    referenceId: process.env.REFUND_REFERENCE_ID?.trim() || refundId,
    refundId,
    paymentMethod,
    reason,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'failed') process.exitCode = 1;
}

await main();
