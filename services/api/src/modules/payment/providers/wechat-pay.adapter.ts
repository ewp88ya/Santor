import { createHash, createSign, randomBytes } from 'node:crypto';

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
    throw new Error(`WeChat Pay ${name} is not configured`);
  }

  return normalized;
}

function config() {
  return {
    appId: required(paymentConfig.wechat.wechatAppId, 'APPID'),
    mchId: required(paymentConfig.wechat.wechatMchId, 'merchant ID'),
    apiV3Key: required(paymentConfig.wechat.wechatApiV3Key, 'API v3 key'),
    privateKey: required(paymentConfig.wechat.wechatPrivateKey, 'private key'),
    serialNumber: required(paymentConfig.wechat.wechatSerialNumber, 'certificate serial number'),
    baseUrl: (paymentConfig.wechat.wechatBaseUrl ?? 'https://api.mch.weixin.qq.com').replace(
      /\/$/,
      '',
    ),
    notifyUrl: paymentConfig.wechat.wechatNotifyUrl,
  };
}

function nonce(): string {
  return randomBytes(16).toString('hex');
}

function signRequest(method: string, path: string, body: string, privateKey: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestNonce = nonce();
  const message = `${method}\n${path}\n${timestamp}\n${requestNonce}\n${body}\n`;
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  const signature = signer.sign(privateKey, 'base64');

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config().mchId}",nonce_str="${requestNonce}",timestamp="${timestamp}",serial_no="${config().serialNumber}",signature="${signature}"`;
}

async function requestJson<T>(method: string, path: string, body = ''): Promise<T> {
  const current = config();
  const response = await fetch(`${current.baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: signRequest(method, path, body, current.privateKey),
    },
    body: body || undefined,
  });

  const text = await response.text();
  let payload: unknown;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`WeChat Pay returned invalid JSON (${response.status})`);
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? '')
        : '';
    throw new Error(message || `WeChat Pay request failed (${response.status})`);
  }

  return payload as T;
}

function amountToFen(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('WeChat Pay amount must be a finite non-negative number');
  }

  return Math.round(amount);
}

type NativeOrderResponse = {
  prepay_id?: string;
  code_url?: string;
};

type OrderResponse = {
  transaction_id?: string;
  out_trade_no?: string;
  trade_state?: string;
  amount?: {
    total?: number;
    currency?: string;
  };
};

export class WeChatPayAdapter implements PaymentProvider {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const current = config();
    const currency = request.currency.trim().toUpperCase();

    if (currency !== 'CNY') {
      return {
        success: false,
        error: 'WeChat Pay currently supports CNY only',
      };
    }

    const body = JSON.stringify({
      appid: current.appId,
      mchid: current.mchId,
      description: `Santor payment ${request.referenceId}`,
      out_trade_no: request.referenceId,
      notify_url: current.notifyUrl,
      amount: {
        total: amountToFen(request.amount),
        currency,
      },
    });

    const response = await requestJson<NativeOrderResponse>(
      'POST',
      '/v3/pay/transactions/native',
      body,
    );

    return {
      success: Boolean(response.prepay_id || response.code_url),
      providerPaymentId: response.prepay_id,
      transactionId: request.referenceId,
      actions: response.code_url
        ? [{ type: 'qr', descriptor: 'code_url', value: response.code_url }]
        : [],
      error:
        response.prepay_id || response.code_url
          ? undefined
          : 'WeChat Pay did not return a payment token',
    };
  }

  async verifyPayment(
    paymentId: string,
    context?: PaymentVerificationContext,
  ): Promise<PaymentVerificationResult> {
    const current = config();
    const outTradeNo = context?.transactionId ?? paymentId;
    const response = await requestJson<OrderResponse>(
      'GET',
      `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(current.mchId)}`,
    );

    const state = response.trade_state?.toUpperCase();
    const status: PaymentVerificationResult['status'] =
      state === 'SUCCESS'
        ? 'success'
        : state === 'CLOSED' || state === 'REVOKED' || state === 'PAYERROR'
          ? 'failed'
          : state === 'NOTPAY' || state === 'USERPAYING'
            ? 'pending'
            : state === 'REFUND'
              ? 'success'
              : 'unknown';

    return {
      status,
      providerPaymentId: paymentId,
      transactionId: response.transaction_id,
      referenceId: response.out_trade_no,
      amount: response.amount?.total,
      currency: response.amount?.currency?.toUpperCase(),
      error: status === 'unknown' ? `Unknown WeChat Pay state: ${state ?? 'missing'}` : undefined,
    };
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
