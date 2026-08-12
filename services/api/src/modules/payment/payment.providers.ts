import type { PaymentProvider } from './providers/payment.provider.js';
import { GlobalCardAdapter } from './providers/global-card.adapter.js';
import { XenditAdapter } from './providers/xendit.adapter.js';
import { RussiaPaymentAdapter } from './providers/russia.adapter.js';

export const paymentProviders: {
  globalCard: PaymentProvider;
  xendit: PaymentProvider;
  russia: PaymentProvider;
} = {
  globalCard: new GlobalCardAdapter(),
  xendit: new XenditAdapter(),
  russia: new RussiaPaymentAdapter(),
};
