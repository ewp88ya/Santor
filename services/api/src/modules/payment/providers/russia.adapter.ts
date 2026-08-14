import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
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

    // Default provider for Russian bank-card / instant-payment methods.
    if (method === 'SBP' || method === 'MIR') {
      return this.yooKassa;
    }

    // Crypto is always handled by Platega.
    if (method === 'CRYPTO') {
      return this.platega;
    }

    // Fallback provider for unsupported/legacy Russian methods.
    return this.cloudPayments;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const method = request.paymentMethod?.trim().toUpperCase();

    // CRYPTO must always use Platega exclusively.
    if (method === 'CRYPTO') {
      return this.platega.charge(request);
    }

    // SBP/MIR use YooKassa as the default provider.
    if (method === 'SBP' || method === 'MIR') {
      try {
        const yooKassaResult = await this.yooKassa.charge(request);

        if (yooKassaResult.success) {
          return yooKassaResult;
        }

        // YooKassa failed, so fall back to CloudPayments.
        return this.cloudPayments.charge(request);
      } catch {
        // YooKassa request failed unexpectedly, so fall back to CloudPayments.
        return this.cloudPayments.charge(request);
      }
    }

    return this.provider(request).charge(request);
  }

  verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    // Verification is intentionally delegated to the provider that owns
    // the transaction ID. Provider-specific verification is handled by
    // the payment service/webhook reconciliation layer.
    return this.yooKassa.verifyPayment(paymentId);
  }
}
