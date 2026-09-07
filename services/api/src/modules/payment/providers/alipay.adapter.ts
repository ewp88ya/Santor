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

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function getConfig() {
  return {
    appId: required(paymentConfig.alipay.appId, 'app ID'),
    privateKey: required(paymentConfig.alipay.privateKey, 'private key'),
    publicKey: required(paymentConfig.alipay.publicKey, 'public key'),
    baseUrl: normalizeBaseUrl(
      paymentConfig.alipay.baseUrl ?? 'https://open-na-global.alipay.com',
    ),
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

type AlipayCreateResponse = {
  response?: {
    result?: {
      resultCode?: string;
      resultStatus?: string;
      resultMessage?: string;
      paymentId?: string;
      paymentUrl?: string;
      actionForm?: string;
      amount?: { value?: string; currency?: string };
    };
  };
};

type AlipayQueryResponse = {
  response?: {
    result?: {
      resultCode?: string;
      resultStatus?: string;
      resultMessage?: string;
      paymentId?: string;
      referenceOrderId?: string;
      paymentStatus?: string;
      amount?: { value?: string; currency?: string };
    };
  };
};

function isSuccess(status: string | undefined, code: string | undefined): boolean {
  return status === 'S' && code === 'SUCCESS';
}

function toMinorUnitAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Alipay amount must be a finite non-negative number');
  }

  return Math.round(amount).toString();
}

export class AlipayAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = getConfig();

    const payload = {
      productCode: 'CASHIER_PAYMENT',
      paymentRequestId: request.referenceId,
      order: {
        referenceOrderId: request.referenceId,
        orderDescription: `Santor payment ${request.referenceId}`,
        orderAmount: {
          value: toMinorUnitAmount(request.amount),
          currency: request.currency.toUpperCase(),
        },
      },
      paymentAmount: {
        value: toMinorUnitAmount(request.amount),
        currency: request.currency.toUpperCase(),
      },
      paymentRedirectUrl: paymentConfig.alipay.returnUrl,
    };

    const result = await requestJson<AlipayCreateResponse>(
      `${config.baseUrl}/ams/api/v1/payments/pay`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'client-id': config.appId,
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
    const config = getConfig();

    const result = await requestJson<AlipayQueryResponse>(
      `${config.baseUrl}/ams/api/v1/payments/consult`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'client-id': config.appId,
        },
        body: JSON.stringify({
          paymentId,
          referenceOrderId: context?.transactionId,
        }),
      },
    );

    const data = result.response?.result;
    const status = data?.paymentStatus?.toUpperCase();

    let normalized: PaymentVerificationResult['status'];
    if (status === 'SUCCESS') normalized = 'success';
    else if (status === 'CANCELED' || status === 'FAILED') normalized = 'failed';
    else if (status === 'EXPIRED') normalized = 'expired';
    else if (status === 'PROCESSING' || status === 'PENDING') normalized = 'pending';
    else normalized = 'unknown';

    return {
      status: normalized,
      providerPaymentId: data?.paymentId ?? paymentId,
      transactionId: data?.referenceOrderId,
      referenceId: data?.referenceOrderId,
      amount: data?.amount?.value ? Number(data.amount.value) : undefined,
      currency: data?.amount?.currency?.toUpperCase(),
      error:
        normalized === 'unknown' ? data?.resultMessage ?? 'Unknown Alipay payment status' : undefined,
    };
  }
}
