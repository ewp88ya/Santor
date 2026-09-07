import { paymentConfig } from './payment.config.js';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationContext,
  PaymentVerificationResult,
} from './payment.provider.js';

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Alipay ${name} is not configured`);
  }

  return normalized;
}

function getConfig() {
  return {
    appId: required(paymentConfig.alipay.alipayAppId, 'app ID'),
    privateKey: required(paymentConfig.alipay.alipayPrivateKey, 'private key'),
    publicKey: required(paymentConfig.alipay.alipayPublicKey, 'public key'),
    baseUrl: (paymentConfig.alipay.alipayBaseUrl ?? 'https://open-na-global.alipay.com').replace(/\/$/, ''),
    returnUrl: paymentConfig.alipay.alipayReturnUrl,
    notifyUrl: paymentConfig.alipay.alipayNotifyUrl,
  };
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Alipay returned invalid JSON (${response.status})`);
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? '')
        : '';
    throw new Error(message || `Alipay request failed (${response.status})`);
  }

  return payload as T;
}

type AlipayResult = {
  resultCode?: string;
  resultStatus?: string;
  resultMessage?: string;
  paymentId?: string;
  paymentUrl?: string;
  actionForm?: string;
  referenceOrderId?: string;
  paymentStatus?: string;
  amount?: { value?: string; currency?: string };
};

type AlipayResponse = { response?: { result?: AlipayResult } };

function isSuccess(status: string | undefined, code: string | undefined): boolean {
  return status === 'S' && code === 'SUCCESS';
}

function amountToProviderValue(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Alipay amount must be a finite non-negative number');
  }

  return (Math.round(amount) / 100).toFixed(2);
}

export class AlipayAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const current = getConfig();

    const payload = {
      productCode: 'CASHIER_PAYMENT',
      paymentRequestId: request.referenceId,
      order: {
        referenceOrderId: request.referenceId,
        orderDescription: `Santor payment ${request.referenceId}`,
        orderAmount: {
          value: amountToProviderValue(request.amount),
          currency: request.currency.toUpperCase(),
        },
      },
      paymentAmount: {
        value: amountToProviderValue(request.amount),
        currency: request.currency.toUpperCase(),
      },
      paymentRedirectUrl: current.returnUrl,
      paymentNotifyUrl: current.notifyUrl,
    };

    // The adapter deliberately requires both merchant and Alipay public keys
    // before making a provider call. The final provider signature envelope is
    // provider-account specific and is completed/validated by live credentials
    // in Phase 15; local tests exercise the contract without network access.
    void current.privateKey;
    void current.publicKey;

    const result = await requestJson<AlipayResponse>(
      `${current.baseUrl}/ams/api/v1/payments/pay`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'client-id': current.appId,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = result.response?.result;
    const success = isSuccess(data?.resultStatus, data?.resultCode);

    return {
      success,
      providerPaymentId: data?.paymentId,
      transactionId: request.referenceId,
      actions: [
        ...(data?.paymentUrl
          ? [{ type: 'redirect', descriptor: 'payment_url', value: data.paymentUrl }]
          : []),
        ...(data?.actionForm
          ? [{ type: 'form', descriptor: 'action_form', value: data.actionForm }]
          : []),
      ],
      error: success ? undefined : data?.resultMessage ?? 'Alipay payment failed',
    };
  }

  async verifyPayment(
    paymentId: string,
    context?: PaymentVerificationContext,
  ): Promise<PaymentVerificationResult> {
    const current = getConfig();
    void current.privateKey;
    void current.publicKey;

    const result = await requestJson<AlipayResponse>(
      `${current.baseUrl}/ams/api/v1/payments/consult`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'client-id': current.appId,
        },
        body: JSON.stringify({
          paymentId,
          referenceOrderId: context?.transactionId,
        }),
      },
    );

    const data = result.response?.result;
    const providerStatus = data?.paymentStatus?.toUpperCase();
    const status: PaymentVerificationResult['status'] =
      providerStatus === 'SUCCESS'
        ? 'success'
        : providerStatus === 'CANCELED' || providerStatus === 'FAILED'
          ? 'failed'
          : providerStatus === 'EXPIRED'
            ? 'expired'
            : providerStatus === 'PROCESSING' || providerStatus === 'PENDING'
              ? 'pending'
              : 'unknown';

    return {
      status,
      providerPaymentId: data?.paymentId ?? paymentId,
      transactionId: data?.referenceOrderId,
      referenceId: data?.referenceOrderId,
      amount: data?.amount?.value ? Math.round(Number(data.amount.value) * 100) : undefined,
      currency: data?.amount?.currency?.toUpperCase(),
      error: status === 'unknown' ? data?.resultMessage ?? 'Unknown Alipay payment status' : undefined,
    };
  }
}
