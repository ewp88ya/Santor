import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

type YooKassaPaymentResponse = {
  id?: string;
  status?: string;
  paid?: boolean;
  amount?: {
    value?: string;
    currency?: string;
  };
  metadata?: Record<string, string>;
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
  description?: string;
  cancellation_details?: {
    reason?: string;
    party?: string;
  };
};

function getBaseUrl(): string {
  return paymentConfig.russia.yookassaBaseUrl ?? 'https://api.yookassa.ru';
}

function getAuthHeader(shopId: string, secret: string): string {
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
}

function mapStatus(status?: string): PaymentVerificationResult['status'] {
  switch (status?.trim().toLowerCase()) {
    case 'succeeded':
      return 'success';

    case 'pending':
    case 'waiting_for_capture':
      return 'pending';

    case 'canceled':
      return 'failed';

    default:
      return 'unknown';
  }
}

function parseAmount(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : undefined;
}

async function httpRequest<T>(
  path: string,
  init: RequestInit,
  shopId: string,
  secret: string,
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(shopId, secret),
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
        : `YooKassa returned HTTP ${response.status}`;

    throw new Error(message);
  }

  if (!body) {
    throw new Error('YooKassa returned an empty response');
  }

  return body;
}

export class YooKassaAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.russia;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Russia payment provider is disabled',
      };
    }

    if (!config.yookassaShopId || !config.yookassaSecret) {
      return {
        success: false,
        error: 'YooKassa credentials are not configured',
      };
    }

    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: 'YooKassa payment amount must be greater than zero',
      };
    }

    const currency = request.currency.trim().toUpperCase();

    if (!currency) {
      return {
        success: false,
        error: 'YooKassa payment currency is required',
      };
    }

    const idempotenceKey = request.referenceId.trim();

    if (!idempotenceKey) {
      return {
        success: false,
        error: 'YooKassa idempotence key is required',
      };
    }

    try {
      const response = await httpRequest<YooKassaPaymentResponse>(
        '/v3/payments',
        {
          method: 'POST',
          headers: {
            'Idempotence-Key': idempotenceKey,
          },
          body: JSON.stringify({
            amount: {
              value: request.amount.toFixed(2),
              currency,
            },
            capture: true,
            confirmation: {
              type: 'redirect',
              return_url: config.yookassaReturnUrl,
            },
            description: `Santor payment ${request.referenceId}`,
            metadata: {
              reference_id: request.referenceId,
              ...(request.customerId
                ? {
                    customer_id: request.customerId,
                  }
                : {}),
            },
          }),
        },
        config.yookassaShopId,
        config.yookassaSecret,
      );

      const providerPaymentId = response.id;

      if (!providerPaymentId) {
        return {
          success: false,
          error: 'YooKassa response did not contain a payment ID',
        };
      }

      return {
        success: true,
        providerPaymentId,
        transactionId: providerPaymentId,
        settlementCurrency: response.amount?.currency,
        actions: response.confirmation?.confirmation_url
          ? [
              {
                type: 'redirect',
                value: response.confirmation.confirmation_url,
              },
            ]
          : [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `YooKassa request failed: ${error.message}`
            : 'YooKassa request failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const normalizedId = paymentId.trim();

    if (!normalizedId) {
      return {
        status: 'unknown',
        error: 'YooKassa payment ID is required',
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

    if (!config.yookassaShopId || !config.yookassaSecret) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'YooKassa credentials are not configured',
      };
    }

    try {
      const response = await httpRequest<YooKassaPaymentResponse>(
        `/v3/payments/${encodeURIComponent(normalizedId)}`,
        {
          method: 'GET',
        },
        config.yookassaShopId,
        config.yookassaSecret,
      );

      const status = mapStatus(response.status);

      return {
        status,
        providerPaymentId: response.id ?? normalizedId,
        transactionId: response.id ?? normalizedId,
        referenceId: response.metadata?.reference_id,
        amount: parseAmount(response.amount?.value),
        currency: response.amount?.currency,
        error:
          status === 'unknown'
            ? `Unknown YooKassa status: ${response.status ?? 'unknown'}`
            : undefined,
      };
    } catch (error) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error:
          error instanceof Error
            ? `YooKassa verification request failed: ${error.message}`
            : 'YooKassa verification request failed',
      };
    }
  }
}
