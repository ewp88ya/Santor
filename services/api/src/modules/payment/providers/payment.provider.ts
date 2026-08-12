export type PaymentMethod =
  'VISA' | 'MASTERCARD' | 'QRIS' | 'ALIPAY' | 'WECHAT_PAY' | 'SBP' | 'MIR';

export type ChargeRequest = {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  country?: string;
  paymentMethod?: PaymentMethod;
  referenceId: string;
};

export type ChargeResult = {
  success: boolean;
  transactionId?: string;
  providerPaymentId?: string;
  settlementCurrency?: string;
  error?: string;
};

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
