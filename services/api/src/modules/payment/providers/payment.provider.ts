export type PaymentMethod =
  'VISA' | 'MASTERCARD' | 'QRIS' | 'ALIPAY' | 'WECHAT_PAY' | 'SBP' | 'MIR';

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

export type PaymentReconciliationResult = {
  success: boolean;
  status: 'pending' | 'requires_action' | 'success' | 'failed' | 'expired' | 'canceled' | 'unknown';
  providerPaymentId?: string;
  transactionId?: string;
  referenceId?: string;
  amount?: number;
  currency?: string;
  error?: string;
};

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;

  reconcilePayment?(providerPaymentId: string): Promise<PaymentReconciliationResult>;
}
