import type { ChargeRequest, ChargeResult, PaymentProvider } from './payment.provider.js';

export class MockPaymentProvider implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    return {
      success: true,
      transactionId: `mock_tx_${request.referenceId}`,
      providerPaymentId: `mock_pi_${request.referenceId}`,
    };
  }
}
