import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

const PLATEGA_METHOD = {
  SBP: 2,
  MIR: 10,
  CRYPTO: 13,
} as const;

type PlategaMethod = (typeof PLATEGA_METHOD)[keyof typeof PLATEGA_METHOD];

type PlategaCreateResponse = {
  transactionId?: string;
  redirect?: string;
  url?: string;
  status?: string;
  message?: string;
};

type PlategaTransactionResponse = {
  id?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  merchantTransactionId?: string;
  referenceId?: string;
  message?: string;
};

function getMethod(paymentMethod?: string): PlategaMethod | undefined {
  switch (paymentMethod?.trim().toUpperCase()) {
    case 'SBP':
      return PLATEGA_METHOD.SBP;
    case 'MIR':
      return PLATEGA_METHOD.MIR;
    case 'CRYPTO':
      return PLATEGA_METHOD.CRYPTO;
    default:
      return undefined;
  }
}

function mapStatus(status?: string): PaymentVerificationResult['status'] {
  switch (status?.trim().toUpperCase()) {
    case 'CONFIRMED':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'success';

    case 'CANCELED':
    case 'CANCELLED':
    case 'FAILED':
      return 'failed';

    case 'EXPIRED':
      return 'expired';

    case 'PENDING':
    case 'WAITING':
      return 'pending';

    default:
      return 'unknown';
  }
}

function getBaseUrl() {
  return paymentConfig.russia.plategaBaseUrl ?? 'https://app.platega.io';
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-MerchantId': paymentConfig.russia.plategaMerchantId ?? '',
      'X-Secret': paymentConfig.russia.plategaSecret ?? '',
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text();

  let body: T | undefined;

  if (raw) {
    try {
      body = JSON.parse(raw) as T;
    } catch {
      body = undefined;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `Platega returned HTTP ${response.status}`;

    throw new Error(message);
  }

  if (!body) {
    throw new Error('Platega returned an empty response');
  }

  return body;
}

export class PlategaAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.russia;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Russia payment provider is disabled',
      };
    }

    if (!config.plategaMerchantId || !config.plategaSecret) {
      return {
        success: false,
        error: 'Platega credentials are not configured',
      };
    }

    const method = getMethod(request.paymentMethod);

    if (!method) {
      return {
        success: false,
        error: `Unsupported Platega payment method: ${request.paymentMethod ?? 'unknown'}`,
      };
    }

    try {
      const response = await requestPlategaCharge(request, method);

      const providerPaymentId = response.transactionId;

      if (!providerPaymentId) {
        return {
          success: false,
          error: 'Platega response did not contain a transaction ID',
        };
      }

      return {
        success: true,
        providerPaymentId,
        transactionId: providerPaymentId,
        actions:
          response.redirect || response.url
            ? [
                {
                  type: 'redirect',
                  value: response.redirect ?? response.url,
                },
              ]
            : [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `Platega request failed: ${error.message}`
            : 'Platega request failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const normalizedId = paymentId.trim();

    if (!normalizedId) {
      return {
        status: 'unknown',
        error: 'Platega payment ID is required',
      };
    }

    const config = paymentConfig.russia;

    if (!config.enabled) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'Russia payment provider is disabled',
      };
    }

    if (!config.plategaMerchantId || !config.plategaSecret) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'Platega credentials are not configured',
      };
    }

    try {
      const response = await request<PlategaTransactionResponse>(
        `/transaction/${encodeURIComponent(normalizedId)}`,
        {
          method: 'GET',
        },
      );

      return {
        status: mapStatus(response.status),
        providerPaymentId: response.id ?? response.transactionId ?? normalizedId,
        transactionId: response.transactionId ?? response.id ?? normalizedId,
        referenceId: response.merchantTransactionId ?? response.referenceId,
        amount: response.amount,
        currency: response.currency,
        error:
          mapStatus(response.status) === 'unknown'
            ? (response.message ?? `Unknown Platega status: ${response.status ?? 'unknown'}`)
            : undefined,
      };
    } catch (error) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error:
          error instanceof Error
            ? `Platega verification request failed: ${error.message}`
            : 'Platega verification request failed',
      };
    }
  }
}

async function requestPlategaCharge(
  payment: ChargeRequest,
  method: PlategaMethod,
): Promise<PlategaCreateResponse> {
  return request<PlategaCreateResponse>('/transaction/process', {
    method: 'POST',
    body: JSON.stringify({
      paymentMethod: method,
      amount: payment.amount,
      currency: payment.currency,
      merchantTransactionId: payment.referenceId,
      description: `Santor payment ${payment.referenceId}`,
    }),
  });
}
