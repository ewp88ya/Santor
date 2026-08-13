import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { PlategaAdapter } from './platega.adapter.js';

export class RussiaPaymentAdapter implements PaymentProvider {
  private readonly platega = new PlategaAdapter();

  charge(request: ChargeRequest): Promise<ChargeResult> {
    return this.platega.charge(request);
  }

  verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return this.platega.verifyPayment(paymentId);
  }
}
