export type PaymentMethod =
  | 'VISA'
  | 'MASTERCARD'
  | 'QRIS'
  | 'ALIPAY'
  | 'WECHAT_PAY'
  | 'SBP'
  | 'MIR';

export type ChargeRequest = {
  customerId?: string;
  paymentMethodId?: string;
  amount: number;
  currency: string;
  country?: string;
  paymentMethod?: PaymentMethod;
  referenceId: string;
};

export type PaymentAction = {
  type?: string;
  descriptor?: string;
  value?: string;
};

export type ChargeResult = {
  success: boolean;
  transactionId?: string;
  providerPaymentId?: string;
  settlementCurrency?: string;
  actions?: PaymentAction[];
  error?: string;
};

export type PaymentVerificationStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'expired'
  | 'unknown';

export type PaymentVerificationResult = {
  status: PaymentVerificationStatus;
  providerPaymentId?: string;
  transactionId?: string;
  referenceId?: string;
  amount?: number;
  currency?: string;
  error?: string;
};

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;

  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
}
