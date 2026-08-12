import type { ChargeRequest, ChargeResult, PaymentProvider } from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

export class XenditAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.xendit;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Xendit provider is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Xendit API key is not configured',
      };
    }

    return {
      success: false,
      error: `Xendit integration is not implemented yet for ${request.country}/${request.paymentMethod}`,
    };
  }
}
