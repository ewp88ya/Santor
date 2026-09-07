import type { PaymentProvider } from './providers/payment.provider.js';

import { AlipayAdapter } from './providers/alipay.adapter.js';
import { GlobalCardAdapter } from './providers/global-card.adapter.js';
import { PayPalAdapter } from './providers/paypal.adapter.js';
import { WeChatPayAdapter } from './providers/wechat-pay.adapter.js';
import { XenditAdapter } from './providers/xendit.adapter.js';
import { RussiaPaymentAdapter } from './providers/russia.adapter.js';

export const paymentProviders: {
  globalCard: PaymentProvider;
  paypal: PaymentProvider;
  xendit: PaymentProvider;
  russia: PaymentProvider;
  alipay: PaymentProvider;
  wechat: PaymentProvider;
} = {
  globalCard: new GlobalCardAdapter(),
  paypal: new PayPalAdapter(),
  xendit: new XenditAdapter(),
  russia: new RussiaPaymentAdapter(),
  alipay: new AlipayAdapter(),
  wechat: new WeChatPayAdapter(),
};
