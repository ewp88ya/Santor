import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

type CloudPaymentsResponse<T> = {
  Success?: boolean;
  Message?: string;
  Model?: T;
};

type SbpLinkResponse = {
  QrUrl?: string;
  TransactionId?: number;
  MerchantOrderId?: string;
  ProviderQrId?: string;
  Amount?: number;
  Message?: string;
  IsTest?: boolean;
};

type CloudPaymentsTransaction = {
  TransactionId?: number;
  Amount?: number;
  Currency?: string;
  InvoiceId?: string;
  AccountId?: string;
  Status?: string;
  Reason?: string;
  PaymentMethod?: string;
};

function getBaseUrl() {
  return paymentConfig.russia.cloudPaymentsBaseUrl ?? 'https://api.cloudpayments.ru';
}

function authHeader(publicId: string, secret: string) {
  return `Basic ${Buffer.from(`${publicId}:${secret}`).toString('base64')}`;
}

function mapStatus(status?: string): PaymentVerificationResult['status'] {
  switch (status?.trim().toLowerCase()) {
    case 'completed':
    case 'authorized':
      return 'success';

    case 'pending':
    case 'processing':
      return 'pending';

    case 'cancelled':
    case 'canceled':
    case 'declined':
    case 'failed':
      return 'failed';

    default:
      return 'unknown';
  }
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 250;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cloudPaymentsRequest<T>(
  path: string,
  body: Record<string, unknown>,
  publicId: string,
  secret: string,
): Promise<T> {
  let lastError: Error | undefined;
  const requestId = crypto.randomUUID();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${getBaseUrl()}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader(publicId, secret),
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const raw = await response.text();

      let payload: CloudPaymentsResponse<T> | undefined;

      try {
        payload = raw ? (JSON.parse(raw) as CloudPaymentsResponse<T>) : undefined;
      } catch {
        throw new Error(`CloudPayments returned invalid JSON (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const error = new Error(
          payload?.Message ?? `CloudPayments returned HTTP ${response.status}`,
        );

        if (attempt < MAX_RETRIES && isRetryableStatus(response.status)) {
          lastError = error;
          clearTimeout(timeout);
          await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
          continue;
        }

        throw error;
      }

      if (!payload?.Success) {
        throw new Error(payload?.Message ?? 'CloudPayments request failed');
      }

      if (!payload.Model) {
        throw new Error('CloudPayments response did not contain Model');
      }

      return payload.Model;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`CloudPayments request timed out after ${REQUEST_TIMEOUT_MS}ms`);

        if (attempt < MAX_RETRIES) {
          clearTimeout(timeout);
          await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
          continue;
        }

        throw lastError;
      }

      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('CloudPayments request failed');
}

export class CloudPaymentsAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.russia;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Russia payment provider is disabled',
      };
    }

    if (!config.cloudPaymentsPublicId || !config.cloudPaymentsApiSecret) {
      return {
        success: false,
        error: 'CloudPayments credentials are not configured',
      };
    }

    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: 'CloudPayments amount must be greater than zero',
      };
    }

    if (request.currency.trim().toUpperCase() !== 'RUB') {
      return {
        success: false,
        error: 'CloudPayments Russia flow requires RUB',
      };
    }

    const method = request.paymentMethod?.trim().toUpperCase();

    if (method !== 'SBP' && method !== 'MIR') {
      return {
        success: false,
        error: `Unsupported CloudPayments payment method: ${method ?? 'unknown'}`,
      };
    }

    const referenceId = request.referenceId.trim();

    if (!referenceId) {
      return {
        success: false,
        error: 'CloudPayments reference ID is required',
      };
    }

    try {
      const model =
        method === 'SBP'
          ? await cloudPaymentsRequest<SbpLinkResponse>(
              '/payments/qr/sbp/link',
              {
                Amount: request.amount,
                Currency: 'RUB',
                InvoiceId: referenceId,
                AccountId: request.customerId ?? referenceId,
                Description: `Santor payment ${referenceId}`,
              },
              config.cloudPaymentsPublicId,
              config.cloudPaymentsApiSecret,
            )
          : await cloudPaymentsRequest<SbpLinkResponse>(
              '/payments/cards/charge',
              {
                Amount: request.amount,
                Currency: 'RUB',
                InvoiceId: referenceId,
                AccountId: request.customerId ?? referenceId,
                Description: `Santor payment ${referenceId}`,
                PaymentMethod: 'MIR',
              },
              config.cloudPaymentsPublicId,
              config.cloudPaymentsApiSecret,
            );

      if (model.TransactionId === undefined) {
        return {
          success: false,
          error: 'CloudPayments SBP response did not contain transaction ID',
        };
      }

      const transactionId = String(model.TransactionId);

      return {
        success: true,
        providerPaymentId: transactionId,
        transactionId,
        settlementCurrency: 'RUB',
        actions: model.QrUrl
          ? [
              {
                type: 'redirect',
                value: model.QrUrl,
              },
            ]
          : [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `CloudPayments ${method} request failed: ${error.message}`
            : `CloudPayments ${method} request failed`,
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const normalizedId = paymentId.trim();

    if (!normalizedId) {
      return {
        status: 'unknown',
        error: 'CloudPayments transaction ID is required',
      };
    }

    const config = paymentConfig.russia;

    if (!config.cloudPaymentsPublicId || !config.cloudPaymentsApiSecret) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'CloudPayments credentials are not configured',
      };
    }

    const transactionId = Number(normalizedId);

    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'CloudPayments transaction ID must be numeric',
      };
    }

    try {
      const model = await cloudPaymentsRequest<CloudPaymentsTransaction>(
        '/payments/get',
        {
          TransactionId: transactionId,
        },
        config.cloudPaymentsPublicId,
        config.cloudPaymentsApiSecret,
      );

      const status = mapStatus(model.Status);

      return {
        status,
        providerPaymentId: String(model.TransactionId ?? transactionId),
        transactionId: String(model.TransactionId ?? transactionId),
        referenceId: model.InvoiceId,
        amount: model.Amount,
        currency: model.Currency,
        error:
          status === 'unknown'
            ? `Unknown CloudPayments status: ${model.Status ?? 'unknown'}`
            : undefined,
      };
    } catch (error) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error:
          error instanceof Error
            ? `CloudPayments verification failed: ${error.message}`
            : 'CloudPayments verification failed',
      };
    }
  }
}
