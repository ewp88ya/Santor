export type ChargeRequest = {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  referenceId: string;
};

export type ChargeResult = {
  success: boolean;
  transactionId?: string;
  providerPaymentId?: string;
  error?: string;
};

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
