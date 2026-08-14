import type { PaymentProvider } from './providers/payment.provider.js';

import { GlobalCardAdapter } from './providers/global-card.adapter.js';
import { PayPalAdapter } from './providers/paypal.adapter.js';
import { XenditAdapter } from './providers/xendit.adapter.js';
import { RussiaPaymentAdapter } from './providers/russia.adapter.js';

export const paymentProviders: {
  globalCard: PaymentProvider;
  paypal: PaymentProvider;
  xendit: PaymentProvider;
  russia: PaymentProvider;
} = {
  globalCard: new GlobalCardAdapter(),
  paypal: new PayPalAdapter(),
  xendit: new XenditAdapter(),
  russia: new RussiaPaymentAdapter(),
};
