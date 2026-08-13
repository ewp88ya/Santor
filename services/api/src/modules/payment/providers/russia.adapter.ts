import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

export class RussiaPaymentAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.russia;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Russia payment provider is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Russia payment provider API key is not configured',
      };
    }

    return {
      success: false,
      error: `Russia payment integration is not implemented yet for ${request.paymentMethod}`,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return {
      status: 'unknown',
      providerPaymentId: paymentId.trim() || undefined,
      error: 'Russia payment verification is not implemented yet',
    };
  }
}
