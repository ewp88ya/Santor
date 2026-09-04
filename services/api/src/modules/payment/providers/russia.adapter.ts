import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationContext,
  PaymentVerificationResult,
} from './payment.provider.js';

import { CloudPaymentsAdapter } from './cloudpayments.adapter.js';
import { PlategaAdapter } from './platega.adapter.js';
import { YooKassaAdapter } from './yookassa.adapter.js';

export class RussiaPaymentAdapter implements PaymentProvider {
  private readonly yooKassa = new YooKassaAdapter();
  private readonly cloudPayments = new CloudPaymentsAdapter();
  private readonly platega = new PlategaAdapter();

  private provider(request: ChargeRequest): PaymentProvider {
    const method = request.paymentMethod?.trim().toUpperCase();

    if (method === 'SBP' || method === 'MIR') {
      return this.yooKassa;
    }

    if (method === 'CRYPTO') {
      return this.platega;
    }

    return this.cloudPayments;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const method = request.paymentMethod?.trim().toUpperCase();

    if (method === 'CRYPTO') {
      return this.platega.charge(request);
    }

    if (method === 'SBP' || method === 'MIR') {
      try {
        const yooKassaResult = await this.yooKassa.charge(request);

        if (yooKassaResult.success) {
          return yooKassaResult;
        }

        return this.cloudPayments.charge(request);
      } catch {
        return this.cloudPayments.charge(request);
      }
    }

    return this.provider(request).charge(request);
  }

  verifyPayment(
    paymentId: string,
    context?: PaymentVerificationContext,
  ): Promise<PaymentVerificationResult> {
    const method = context?.paymentMethod?.trim().toUpperCase();

    if (method === 'CRYPTO') {
      return this.platega.verifyPayment(paymentId);
    }

    if (/^\d+$/.test(context?.transactionId ?? paymentId)) {
      return this.cloudPayments.verifyPayment(context?.transactionId ?? paymentId);
    }

    return this.yooKassa.verifyPayment(paymentId);
  }
}
