import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentReconciliationResult,
} from './payment.provider.js';

import { paymentConfig } from './payment.config.js';

type XenditPaymentRequestResponse = {
  payment_request_id?: string;
  latest_payment_id?: string;
  reference_id?: string;
  status?: string;
  request_amount?: number;
  currency?: string;
  actions?: Array<{
    type?: string;
    descriptor?: string;
    value?: string;
  }>;
};

type XenditErrorResponse = {
  error_code?: string;
  message?: string;
};

function getChannelCode(
  country: string | undefined,
  paymentMethod: ChargeRequest['paymentMethod'],
): string {
  const normalizedCountry = country?.trim().toUpperCase();

  switch (paymentMethod) {
    case 'QRIS':
      return 'QRIS';

    case 'ALIPAY':
      return 'ALIPAY';

    case 'WECHAT_PAY':
      return 'WECHATPAY';

    case 'VISA':
    case 'MASTERCARD':
      return 'CARDS';

    default:
      break;
  }

  if (normalizedCountry === 'ID') {
    return 'QRIS';
  }

  throw new Error(`Unsupported Xendit payment method: ${paymentMethod ?? 'unknown'}`);
}

function getChannelProperties(request: ChargeRequest): Record<string, unknown> {
  const paymentMethod = request.paymentMethod;

  switch (paymentMethod) {
    case 'QRIS':
      return {};

    case 'ALIPAY':
      return {};

    case 'WECHAT_PAY':
      return {};

    case 'VISA':
    case 'MASTERCARD':
      if (request.paymentMethodId) {
        return {
          payment_method_id: request.paymentMethodId,
        };
      }

      return {};

    default:
      return {};
  }
}

function normalizeXenditStatus(status: string | undefined): PaymentReconciliationResult['status'] {
  switch (status?.trim().toUpperCase()) {
    case 'SUCCEEDED':
      return 'success';

    case 'FAILED':
      return 'failed';

    case 'EXPIRED':
      return 'expired';

    case 'CANCELED':
    case 'CANCELLED':
      return 'canceled';

    case 'PENDING':
      return 'pending';

    case 'REQUIRES_ACTION':
      return 'requires_action';

    default:
      return 'unknown';
  }
}

export class XenditAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const config = paymentConfig.xendit;

    if (!config.enabled) {
      return {
        success: false,
        error: 'Xendit provider is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Xendit API key is not configured',
      };
    }

    if (!config.baseUrl) {
      return {
        success: false,
        error: 'Xendit base URL is not configured',
      };
    }

    if (!request.referenceId.trim()) {
      return {
        success: false,
        error: 'Payment reference ID is required',
      };
    }

    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: 'Payment amount must be greater than zero',
      };
    }

    const currency = request.currency.trim().toUpperCase();

    if (!currency) {
      return {
        success: false,
        error: 'Payment currency is required',
      };
    }

    const country = request.country?.trim().toUpperCase();

    if (!country) {
      return {
        success: false,
        error: 'Payment country is required for Xendit',
      };
    }

    let channelCode: string;

    try {
      channelCode = getChannelCode(country, request.paymentMethod);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unsupported payment method',
      };
    }

    const url = new URL('/v3/payment_requests', config.baseUrl);

    const payload = {
      reference_id: request.referenceId,
      type: 'PAY',
      country,
      currency,
      request_amount: request.amount,
      capture_method: 'AUTOMATIC',
      channel_code: channelCode,
      channel_properties: getChannelProperties(request),
      ...(request.customerId?.trim()
        ? {
            customer_id: request.customerId.trim(),
          }
        : {}),
      metadata: {
        santor_reference_id: request.referenceId,
        payment_method: request.paymentMethod,
      },
    };

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-version': '2024-11-11',
          'Idempotency-Key': request.referenceId,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `Xendit request failed: ${error.message}`
            : 'Xendit request failed',
      };
    }

    const rawBody = await response.text();

    let body: XenditPaymentRequestResponse | XenditErrorResponse | undefined;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as XenditPaymentRequestResponse | XenditErrorResponse;
      } catch {
        body = undefined;
      }
    }

    if (!response.ok) {
      const errorBody = body as XenditErrorResponse | undefined;

      return {
        success: false,
        error:
          errorBody?.message ?? errorBody?.error_code ?? `Xendit returned HTTP ${response.status}`,
      };
    }

    const paymentResponse = body as XenditPaymentRequestResponse | undefined;

    const paymentRequestId = paymentResponse?.payment_request_id;

    if (!paymentRequestId) {
      return {
        success: false,
        error: 'Xendit response did not contain a payment request ID',
      };
    }

    return {
      success: true,
      transactionId: paymentResponse?.latest_payment_id ?? paymentRequestId,
      providerPaymentId: paymentRequestId,
      settlementCurrency: currency,
      actions: paymentResponse?.actions ?? [],
    };
  }

  async reconcilePayment(providerPaymentId: string): Promise<PaymentReconciliationResult> {
    const config = paymentConfig.xendit;

    if (!config.enabled) {
      return {
        success: false,
        status: 'unknown',
        error: 'Xendit provider is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        status: 'unknown',
        error: 'Xendit API key is not configured',
      };
    }

    if (!config.baseUrl) {
      return {
        success: false,
        status: 'unknown',
        error: 'Xendit base URL is not configured',
      };
    }

    const normalizedProviderPaymentId = providerPaymentId.trim();

    if (!normalizedProviderPaymentId) {
      return {
        success: false,
        status: 'unknown',
        error: 'Xendit payment request ID is required',
      };
    }

    const url = new URL(
      `/v3/payment_requests/${encodeURIComponent(normalizedProviderPaymentId)}`,
      config.baseUrl,
    );

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
          Accept: 'application/json',
          'api-version': '2024-11-11',
        },
      });
    } catch (error) {
      return {
        success: false,
        status: 'unknown',
        error:
          error instanceof Error
            ? `Xendit reconciliation request failed: ${error.message}`
            : 'Xendit reconciliation request failed',
      };
    }

    const rawBody = await response.text();

    let body: XenditPaymentRequestResponse | XenditErrorResponse | undefined;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as XenditPaymentRequestResponse | XenditErrorResponse;
      } catch {
        body = undefined;
      }
    }

    if (!response.ok) {
      const errorBody = body as XenditErrorResponse | undefined;

      return {
        success: false,
        status: 'unknown',
        error:
          errorBody?.message ??
          errorBody?.error_code ??
          `Xendit reconciliation returned HTTP ${response.status}`,
      };
    }

    const paymentResponse = body as XenditPaymentRequestResponse | undefined;

    const normalizedStatus = normalizeXenditStatus(paymentResponse?.status);

    return {
      success: true,
      status: normalizedStatus,
      providerPaymentId: paymentResponse?.payment_request_id ?? normalizedProviderPaymentId,
      transactionId: paymentResponse?.latest_payment_id,
      referenceId: paymentResponse?.reference_id,
      amount: paymentResponse?.request_amount,
      currency: paymentResponse?.currency,
    };
  }
}
