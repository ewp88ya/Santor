import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

type StripePaymentIntent = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  client_secret?: string;
  next_action?: {
    type?: string;
    redirect_to_url?: {
      url?: string;
    };
  };
  last_payment_error?: {
    message?: string;
  };
};

type StripeErrorResponse = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'SGD', 'AUD', 'JPY']);

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

function getBaseUrl(): string {
  return paymentConfig.stripe.stripeBaseUrl ?? 'https://api.stripe.com';
}

function toMinorUnits(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

function mapStripeStatus(status?: string): PaymentVerificationResult['status'] {
  switch (status) {
    case 'succeeded':
      return 'success';

    case 'processing':
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_capture':
      return 'pending';

    case 'canceled':
      return 'failed';

    case 'requires_payment_method':
      return 'failed';

    default:
      return 'unknown';
  }
}

function stripeAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function stripeRequest<T>(path: string, init: RequestInit, secretKey: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: stripeAuthHeader(secretKey),
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
    const errorBody = body as StripeErrorResponse | undefined;

    throw new Error(
      errorBody?.error?.message ??
        errorBody?.error?.code ??
        `Stripe returned HTTP ${response.status}`,
    );
  }

  if (!body) {
    throw new Error('Stripe returned an empty response');
  }

  return body;
}

function encodeForm(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export class GlobalCardAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.stripe;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Stripe global card provider is disabled',
      };
    }

    if (!config.stripeSecretKey) {
      return {
        success: false,
        error: 'Stripe secret key is not configured',
      };
    }

    const method = request.paymentMethod?.trim().toUpperCase();

    if (method !== 'VISA' && method !== 'MASTERCARD') {
      return {
        success: false,
        error: `Unsupported global card payment method: ${method ?? 'unknown'}`,
      };
    }

    const currency = request.currency.trim().toUpperCase();

    if (!SUPPORTED_CURRENCIES.has(currency)) {
      return {
        success: false,
        error:
          `Unsupported global card currency: ${currency}. ` +
          'Supported currencies: USD, EUR, SGD, AUD, JPY',
      };
    }

    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: 'Global card payment amount must be greater than zero',
      };
    }

    const referenceId = request.referenceId.trim();

    if (!referenceId) {
      return {
        success: false,
        error: 'Global card reference ID is required',
      };
    }

    const amount = toMinorUnits(request.amount, currency);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Global card payment amount is invalid',
      };
    }

    const params: Record<string, string> = {
      amount: String(amount),
      currency: currency.toLowerCase(),
      confirm: 'true',
      payment_method_types: 'card',
      description: `Santor payment ${referenceId}`,
      'metadata[santor_reference_id]': referenceId,
      'metadata[payment_method]': method,
    };

    if (request.paymentMethodId?.trim()) {
      params.payment_method = request.paymentMethodId.trim();
    }

    if (request.customerId?.trim()) {
      params['metadata[santor_customer_id]'] = request.customerId.trim();
    }

    try {
      const response = await stripeRequest<StripePaymentIntent>(
        '/v1/payment_intents',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': referenceId,
          },
          body: encodeForm(params),
        },
        config.stripeSecretKey,
      );

      const providerPaymentId = response.id;

      if (!providerPaymentId) {
        return {
          success: false,
          error: 'Stripe response did not contain a payment intent ID',
        };
      }

      const status = mapStripeStatus(response.status);

      if (status === 'failed') {
        return {
          success: false,
          providerPaymentId,
          transactionId: providerPaymentId,
          settlementCurrency: response.currency?.toUpperCase() ?? currency,
          error:
            response.last_payment_error?.message ??
            `Stripe payment failed with status ${response.status ?? 'unknown'}`,
        };
      }

      const actions = response.next_action?.redirect_to_url?.url
        ? [
            {
              type: 'redirect',
              descriptor: response.next_action.type,
              value: response.next_action.redirect_to_url.url,
            },
          ]
        : response.client_secret
          ? [
              {
                type: 'client_secret',
                value: response.client_secret,
              },
            ]
          : [];

      return {
        success: true,
        providerPaymentId,
        transactionId: providerPaymentId,
        settlementCurrency: response.currency?.toUpperCase() ?? currency,
        actions,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `Stripe request failed: ${error.message}`
            : 'Stripe request failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const config = paymentConfig.stripe;
    const normalizedId = paymentId.trim();

    if (!normalizedId) {
      return {
        status: 'unknown',
        error: 'Stripe payment intent ID is required',
      };
    }

    if (!config.enabled) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'Stripe global card provider is disabled',
      };
    }

    if (!config.stripeSecretKey) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'Stripe secret key is not configured',
      };
    }

    try {
      const response = await stripeRequest<StripePaymentIntent>(
        `/v1/payment_intents/${encodeURIComponent(normalizedId)}`,
        {
          method: 'GET',
        },
        config.stripeSecretKey,
      );

      return {
        status: mapStripeStatus(response.status),
        providerPaymentId: response.id ?? normalizedId,
        transactionId: response.id ?? normalizedId,
        amount: response.amount,
        currency: response.currency?.toUpperCase(),
      };
    } catch (error) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error:
          error instanceof Error
            ? `Stripe verification failed: ${error.message}`
            : 'Stripe verification failed',
      };
    }
  }
}
