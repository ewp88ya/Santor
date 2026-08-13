import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

export class MockPaymentProvider implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    return {
      success: true,
      transactionId: `mock_tx_${request.referenceId}`,
      providerPaymentId: `mock_pi_${request.referenceId}`,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const normalizedPaymentId = paymentId.trim();

    if (!normalizedPaymentId) {
      return {
        status: 'unknown',
        error: 'Payment ID is required',
      };
    }

    return {
      status: 'success',
      providerPaymentId: normalizedPaymentId,
      transactionId: `mock_tx_${normalizedPaymentId}`,
    };
  }
}
