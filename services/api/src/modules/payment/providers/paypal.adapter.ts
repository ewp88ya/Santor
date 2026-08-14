import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

type PayPalAccessTokenResponse = {
  access_token?: string;
};

type PayPalLink = {
  href?: string;
  rel?: string;
};

type PayPalOrderResponse = {
  id?: string;
  status?: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          value?: string;
          currency_code?: string;
        };
      }>;
    };
  }>;
};

type PayPalErrorResponse = {
  name?: string;
  message?: string;
  details?: Array<{
    issue?: string;
    description?: string;
  }>;
};

function getBaseUrl(): string {
  return paymentConfig.paypal.paypalBaseUrl ?? 'https://api-m.paypal.com';
}

function getBasicAuth(): string {
  const config = paymentConfig.paypal;

  return `Basic ${Buffer.from(
    `${config.paypalClientId}:${config.paypalClientSecret}`,
  ).toString('base64')}`;
}

function mapOrderStatus(
  status?: string,
): PaymentVerificationResult['status'] {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'success';

    case 'APPROVED':
    case 'CREATED':
    case 'PAYER_ACTION_REQUIRED':
      return 'pending';

    case 'VOIDED':
      return 'failed';

    default:
      return 'unknown';
  }
}

function getLink(
  links: PayPalLink[] | undefined,
  rel: string,
): string | undefined {
  return links?.find((link) => link.rel === rel)?.href;
}

async function getAccessToken(): Promise<string> {
  const config = paymentConfig.paypal;

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en_US',
      Authorization: getBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const raw = await response.text();

  let body: PayPalAccessTokenResponse | PayPalErrorResponse | undefined;

  if (raw) {
    try {
      body = JSON.parse(raw) as PayPalAccessTokenResponse | PayPalErrorResponse;
    } catch {
      body = undefined;
    }
  }

  if (!response.ok) {
    const errorBody = body as PayPalErrorResponse | undefined;

    throw new Error(
      errorBody?.message ??
        errorBody?.name ??
        `PayPal OAuth returned HTTP ${response.status}`,
    );
  }

  const token = (body as PayPalAccessTokenResponse | undefined)?.access_token;

  if (!token) {
    throw new Error('PayPal OAuth response did not contain an access token');
  }

  return token;
}

async function paypalRequest<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
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
    const errorBody = body as PayPalErrorResponse | undefined;

    const detail = errorBody?.details?.[0];

    throw new Error(
      detail?.description ??
        errorBody?.message ??
        detail?.issue ??
        errorBody?.name ??
        `PayPal returned HTTP ${response.status}`,
    );
  }

  if (!body) {
    throw new Error('PayPal returned an empty response');
  }

  return body;
}

export class PayPalAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.paypal;

    if (!config.enabled) {
      return {
        success: false,
        error: 'PayPal provider is disabled',
      };
    }

    if (!config.paypalClientId || !config.paypalClientSecret) {
      return {
        success: false,
        error: 'PayPal credentials are not configured',
      };
    }

    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: 'PayPal payment amount must be greater than zero',
      };
    }

    const currency = request.currency.trim().toUpperCase();

    if (!currency) {
      return {
        success: false,
        error: 'PayPal payment currency is required',
      };
    }

    const referenceId = request.referenceId.trim();

    if (!referenceId) {
      return {
        success: false,
        error: 'PayPal reference ID is required',
      };
    }

    try {
      const accessToken = await getAccessToken();

      const response = await paypalRequest<PayPalOrderResponse>(
        '/v2/checkout/orders',
        {
          method: 'POST',
          headers: {
            'PayPal-Request-Id': referenceId,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                reference_id: referenceId,
                invoice_id: referenceId,
                amount: {
                  currency_code: currency,
                  value: request.amount.toFixed(2),
                },
                description: `Santor payment ${referenceId}`,
              },
            ],
            application_context: {
              return_url: config.paypalReturnUrl,
              cancel_url: config.paypalCancelUrl,
            },
          }),
        },
        accessToken,
      );

      const orderId = response.id;

      if (!orderId) {
        return {
          success: false,
          error: 'PayPal response did not contain an order ID',
        };
      }

      const approvalUrl =
        getLink(response.links, 'payer-action') ??
        getLink(response.links, 'approve');

      return {
        success: true,
        providerPaymentId: orderId,
        transactionId: orderId,
        settlementCurrency: currency,
        actions: approvalUrl
          ? [
              {
                type: 'redirect',
                value: approvalUrl,
              },
            ]
          : [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `PayPal request failed: ${error.message}`
            : 'PayPal request failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const config = paymentConfig.paypal;
    const normalizedId = paymentId.trim();

    if (!normalizedId) {
      return {
        status: 'unknown',
        error: 'PayPal order ID is required',
      };
    }

    if (!config.enabled) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'PayPal provider is disabled',
      };
    }

    if (!config.paypalClientId || !config.paypalClientSecret) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error: 'PayPal credentials are not configured',
      };
    }

    try {
      const accessToken = await getAccessToken();

      const response = await paypalRequest<PayPalOrderResponse>(
        `/v2/checkout/orders/${encodeURIComponent(normalizedId)}`,
        {
          method: 'GET',
        },
        accessToken,
      );

      const capture = response.purchase_units?.[0]?.payments?.captures?.[0];

      const status = capture?.status === 'COMPLETED'
        ? 'success'
        : mapOrderStatus(response.status);

      return {
        status,
        providerPaymentId: response.id ?? normalizedId,
        transactionId: capture?.id ?? response.id ?? normalizedId,
        amount: capture?.amount?.value
          ? Number(capture.amount.value)
          : undefined,
        currency: capture?.amount?.currency_code,
      };
    } catch (error) {
      return {
        status: 'unknown',
        providerPaymentId: normalizedId,
        error:
          error instanceof Error
            ? `PayPal verification failed: ${error.message}`
            : 'PayPal verification failed',
      };
    }
  }
}
