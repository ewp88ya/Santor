import { paymentConfig } from './providers/payment.config.js';

export type ExternalRefundRequest = {
  provider: string;
  providerPaymentId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  referenceId: string;
  refundId: string;
  paymentMethod?: string;
  reason?: string;
};

export type ExternalRefundResult = {
  status: 'succeeded' | 'pending' | 'failed';
  refundId?: string;
  error?: string;
};

type JsonRecord = Record<string, unknown>;

function parseJson(raw: string): JsonRecord | undefined {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as JsonRecord;
  } catch {
    return undefined;
  }
}

function reasonCode(reason?: string): string {
  const normalized = reason?.trim().toLowerCase();

  if (normalized?.includes('fraud')) return 'fraudulent';
  if (normalized?.includes('duplicate')) return 'duplicate';

  return 'requested_by_customer';
}

function validateRefundRequest(data: ExternalRefundRequest): string | undefined {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return 'Refund amount must be greater than zero';
  }

  if (!/^[A-Za-z]{3}$/.test(data.currency.trim())) {
    return 'Refund currency must be a three-letter ISO currency code';
  }

  if (!data.refundId.trim()) {
    return 'Refund idempotency key is required';
  }

  return undefined;
}

function toMinorUnits(amount: number, currency: string): number {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency === 'JPY') return Math.round(amount);

  return Math.round(amount * 100);
}

async function stripeRefund(data: ExternalRefundRequest): Promise<ExternalRefundResult> {
  const config = paymentConfig.stripe;
  const providerPaymentId = data.providerPaymentId.trim();

  if (!config.enabled) return { status: 'failed', error: 'Stripe provider is disabled' };
  if (!config.stripeSecretKey) {
    return { status: 'failed', error: 'Stripe secret key is not configured' };
  }
  if (!providerPaymentId) {
    return { status: 'failed', error: 'Stripe PaymentIntent ID is required' };
  }

  const params = new URLSearchParams({
    payment_intent: providerPaymentId,
    amount: String(toMinorUnits(data.amount, data.currency)),
    reason: reasonCode(data.reason),
  });

  try {
    const response = await fetch(`${config.stripeBaseUrl}/v1/refunds`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.stripeSecretKey}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': data.refundId,
      },
      body: params.toString(),
    });

    const body = parseJson(await response.text());

    if (!response.ok) {
      const providerError = body?.error as JsonRecord | undefined;

      return {
        status: 'failed',
        error: String(providerError?.message ?? `Stripe returned HTTP ${response.status}`),
      };
    }

    const providerRefundId = typeof body?.id === 'string' ? body.id : undefined;
    const status = typeof body?.status === 'string' ? body.status.toLowerCase() : 'unknown';

    if (status === 'succeeded') return { status: 'succeeded', refundId: providerRefundId };

    if (status === 'pending' || status === 'requires_action') {
      return {
        status: 'pending',
        refundId: providerRefundId,
        error: `Stripe refund status is ${status}`,
      };
    }

    return {
      status: 'failed',
      refundId: providerRefundId,
      error: `Stripe refund status is ${status}`,
    };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? `Stripe refund request failed: ${error.message}`
          : 'Stripe refund request failed',
    };
  }
}

async function paypalAccessToken(): Promise<string> {
  const config = paymentConfig.paypal;

  const response = await fetch(`${config.paypalBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en_US',
      Authorization: `Basic ${Buffer.from(`${config.paypalClientId}:${config.paypalClientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const body = parseJson(await response.text());
  const token = typeof body?.access_token === 'string' ? body.access_token : undefined;

  if (!response.ok || !token) {
    throw new Error(String(body?.message ?? `PayPal OAuth returned HTTP ${response.status}`));
  }

  return token;
}

async function paypalRefund(data: ExternalRefundRequest): Promise<ExternalRefundResult> {
  const config = paymentConfig.paypal;
  const captureId = data.transactionId?.trim();

  if (!config.enabled) return { status: 'failed', error: 'PayPal provider is disabled' };
  if (!config.paypalClientId || !config.paypalClientSecret) {
    return { status: 'failed', error: 'PayPal credentials are not configured' };
  }
  if (!captureId) {
    return { status: 'failed', error: 'PayPal capture ID is required for refund' };
  }

  try {
    const token = await paypalAccessToken();
    const response = await fetch(
      `${config.paypalBaseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': data.refundId,
        },
        body: JSON.stringify({
          amount: {
            currency_code: data.currency.toUpperCase(),
            value: data.amount.toFixed(2),
          },
          note_to_payer: data.reason?.trim() || 'Santor payment refund',
        }),
      },
    );

    const body = parseJson(await response.text());
    const providerRefundId = typeof body?.id === 'string' ? body.id : undefined;
    const status = typeof body?.status === 'string' ? body.status.toUpperCase() : 'UNKNOWN';

    if (!response.ok) {
      return {
        status: 'failed',
        refundId: providerRefundId,
        error: String(body?.message ?? `PayPal returned HTTP ${response.status}`),
      };
    }

    if (status === 'COMPLETED') return { status: 'succeeded', refundId: providerRefundId };

    if (status === 'PENDING') {
      return {
        status: 'pending',
        refundId: providerRefundId,
        error: 'PayPal refund is pending',
      };
    }

    return {
      status: 'failed',
      refundId: providerRefundId,
      error: `PayPal refund status is ${status}`,
    };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? `PayPal refund request failed: ${error.message}`
          : 'PayPal refund request failed',
    };
  }
}

async function xenditRefund(data: ExternalRefundRequest): Promise<ExternalRefundResult> {
  const config = paymentConfig.xendit;
  const paymentRequestId = data.providerPaymentId.trim();

  if (!config.enabled) return { status: 'failed', error: 'Xendit provider is disabled' };
  if (!config.apiKey) return { status: 'failed', error: 'Xendit API key is not configured' };
  if (!paymentRequestId) {
    return { status: 'failed', error: 'Xendit payment request ID is required' };
  }

  try {
    const response = await fetch(new URL('/refunds', config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Idempotency-Key': data.refundId,
      },
      body: JSON.stringify({
        reference_id: data.refundId,
        payment_request_id: paymentRequestId,
        currency: data.currency.toUpperCase(),
        amount: data.amount,
        reason: reasonCode(data.reason).toUpperCase(),
      }),
    });

    const body = parseJson(await response.text());
    const providerRefundId = typeof body?.id === 'string' ? body.id : undefined;
    const status = typeof body?.status === 'string' ? body.status.toUpperCase() : 'UNKNOWN';

    if (!response.ok) {
      return {
        status: 'failed',
        refundId: providerRefundId,
        error: String(body?.message ?? `Xendit returned HTTP ${response.status}`),
      };
    }

    if (status === 'SUCCEEDED') return { status: 'succeeded', refundId: providerRefundId };

    if (status === 'PENDING') {
      return {
        status: 'pending',
        refundId: providerRefundId,
        error: 'Xendit refund is pending',
      };
    }

    return {
      status: 'failed',
      refundId: providerRefundId,
      error: `Xendit refund status is ${status}`,
    };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? `Xendit refund request failed: ${error.message}`
          : 'Xendit refund request failed',
    };
  }
}

async function yookassaRefund(data: ExternalRefundRequest): Promise<ExternalRefundResult> {
  const config = paymentConfig.russia;
  const paymentId = data.providerPaymentId.trim();

  if (!config.enabled) {
    return { status: 'failed', error: 'Russia payment provider is disabled' };
  }
  if (!config.yookassaShopId || !config.yookassaSecret) {
    return { status: 'failed', error: 'YooKassa credentials are not configured' };
  }
  if (!paymentId) return { status: 'failed', error: 'YooKassa payment ID is required' };

  try {
    const response = await fetch(new URL('/v3/refunds', config.yookassaBaseUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.yookassaShopId}:${config.yookassaSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': data.refundId,
      },
      body: JSON.stringify({
        amount: {
          value: data.amount.toFixed(2),
          currency: data.currency.toUpperCase(),
        },
        payment_id: paymentId,
        description: data.reason?.trim() || 'Santor payment refund',
      }),
    });

    const body = parseJson(await response.text());
    const providerRefundId = typeof body?.id === 'string' ? body.id : undefined;
    const status = typeof body?.status === 'string' ? body.status.toLowerCase() : 'unknown';

    if (!response.ok) {
      return {
        status: 'failed',
        refundId: providerRefundId,
        error: String(
          body?.description ?? body?.message ?? `YooKassa returned HTTP ${response.status}`,
        ),
      };
    }

    if (status === 'succeeded') return { status: 'succeeded', refundId: providerRefundId };

    if (status === 'pending') {
      return {
        status: 'pending',
        refundId: providerRefundId,
        error: 'YooKassa refund is pending',
      };
    }

    return {
      status: 'failed',
      refundId: providerRefundId,
      error: `YooKassa refund status is ${status}`,
    };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? `YooKassa refund request failed: ${error.message}`
          : 'YooKassa refund request failed',
    };
  }
}

async function cloudPaymentsRefund(data: ExternalRefundRequest): Promise<ExternalRefundResult> {
  const config = paymentConfig.russia;
  const transactionId = Number(data.transactionId ?? data.providerPaymentId);

  if (!config.enabled) {
    return { status: 'failed', error: 'Russia payment provider is disabled' };
  }
  if (!config.cloudPaymentsPublicId || !config.cloudPaymentsApiSecret) {
    return { status: 'failed', error: 'CloudPayments credentials are not configured' };
  }
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return { status: 'failed', error: 'CloudPayments transaction ID must be numeric' };
  }

  try {
    const response = await fetch(new URL('/payments/refund', config.cloudPaymentsBaseUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.cloudPaymentsPublicId}:${config.cloudPaymentsApiSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'X-Request-ID': data.refundId,
      },
      body: JSON.stringify({
        TransactionId: transactionId,
        Amount: data.amount,
      }),
    });

    const body = parseJson(await response.text());

    if (!response.ok || body?.Success !== true) {
      return {
        status: 'failed',
        error: String(body?.Message ?? `CloudPayments returned HTTP ${response.status}`),
      };
    }

    const model = body?.Model as JsonRecord | undefined;
    const refundTransactionId =
      typeof model?.TransactionId === 'number' ? String(model.TransactionId) : undefined;

    return { status: 'succeeded', refundId: refundTransactionId };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error
          ? `CloudPayments refund request failed: ${error.message}`
          : 'CloudPayments refund request failed',
    };
  }
}

export async function refundExternalPayment(
  data: ExternalRefundRequest,
): Promise<ExternalRefundResult> {
  const validationError = validateRefundRequest(data);

  if (validationError) {
    return { status: 'failed', error: validationError };
  }

  switch (data.provider) {
    case 'GlobalCardAdapter':
      return stripeRefund(data);
    case 'PayPalAdapter':
      return paypalRefund(data);
    case 'XenditAdapter':
      return xenditRefund(data);
    case 'RussiaPaymentAdapter': {
      const method = data.paymentMethod?.trim().toUpperCase();

      if (method === 'CRYPTO') {
        return {
          status: 'failed',
          error: 'Platega refunds are not supported by the configured provider contract',
        };
      }

      if (/^\d+$/.test(data.transactionId ?? data.providerPaymentId)) {
        return cloudPaymentsRefund(data);
      }

      return yookassaRefund(data);
    }
    default:
      return {
        status: 'failed',
        error: `Refunds are not supported for provider ${data.provider}`,
      };
  }
}
