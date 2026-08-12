import type { ChargeRequest, ChargeResult, PaymentProvider } from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

export class GlobalCardAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.globalCard;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Global card provider is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Global card provider API key is not configured',
      };
    }

    return {
      success: false,
      error: `Global card provider integration is not implemented yet for ${request.paymentMethod}`,
    };
  }
}
