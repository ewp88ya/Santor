import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RussiaPaymentAdapter } from './russia.adapter.js';

const yooKassaCharge = vi.fn();
const cloudPaymentsCharge = vi.fn();
const plategaCharge = vi.fn();

vi.mock('./yookassa.adapter.js', () => ({
  YooKassaAdapter: class {
    charge = yooKassaCharge;
    verifyPayment = vi.fn();
  },
}));

vi.mock('./cloudpayments.adapter.js', () => ({
  CloudPaymentsAdapter: class {
    charge = cloudPaymentsCharge;
    verifyPayment = vi.fn();
  },
}));

vi.mock('./platega.adapter.js', () => ({
  PlategaAdapter: class {
    charge = plategaCharge;
    verifyPayment = vi.fn();
  },
}));

describe('RussiaPaymentAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const request = {
    customerId: 'user-1',
    paymentMethodId: 'payment-method-1',
    amount: 1000,
    currency: 'RUB',
    country: 'RU',
    referenceId: 'payment-1',
  };

  it('routes SBP to YooKassa by default', async () => {
    yooKassaCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'yookassa-sbp-1',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(true);
    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).not.toHaveBeenCalled();
    expect(plategaCharge).not.toHaveBeenCalled();
  });

  it('routes MIR to YooKassa by default', async () => {
    yooKassaCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'yookassa-mir-1',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'MIR',
    });

    expect(result.success).toBe(true);
    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).not.toHaveBeenCalled();
    expect(plategaCharge).not.toHaveBeenCalled();
  });

  it('falls back from YooKassa to CloudPayments for SBP', async () => {
    yooKassaCharge.mockResolvedValueOnce({
      success: false,
      error: 'YooKassa unavailable',
    });

    cloudPaymentsCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'cloudpayments-sbp-1',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(true);
    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).toHaveBeenCalledOnce();
    expect(plategaCharge).not.toHaveBeenCalled();

    expect(cloudPaymentsCharge).toHaveBeenCalledWith({
      ...request,
      paymentMethod: 'SBP',
    });
  });

  it('falls back from YooKassa to CloudPayments for MIR', async () => {
    yooKassaCharge.mockResolvedValueOnce({
      success: false,
      error: 'YooKassa unavailable',
    });

    cloudPaymentsCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'cloudpayments-mir-1',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'MIR',
    });

    expect(result.success).toBe(true);
    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).toHaveBeenCalledOnce();
    expect(plategaCharge).not.toHaveBeenCalled();

    expect(cloudPaymentsCharge).toHaveBeenCalledWith({
      ...request,
      paymentMethod: 'MIR',
    });
  });

  it('falls back from YooKassa to CloudPayments when YooKassa throws', async () => {
    yooKassaCharge.mockRejectedValueOnce(new Error('YooKassa timeout'));

    cloudPaymentsCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'cloudpayments-sbp-2',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'SBP',
    });

    expect(result.success).toBe(true);
    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).toHaveBeenCalledOnce();
    expect(plategaCharge).not.toHaveBeenCalled();
  });

  it('returns CloudPayments failure when both YooKassa and CloudPayments fail', async () => {
    yooKassaCharge.mockResolvedValueOnce({
      success: false,
      error: 'YooKassa unavailable',
    });

    cloudPaymentsCharge.mockResolvedValueOnce({
      success: false,
      error: 'CloudPayments unavailable',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'SBP',
    });

    expect(result).toEqual({
      success: false,
      error: 'CloudPayments unavailable',
    });

    expect(yooKassaCharge).toHaveBeenCalledOnce();
    expect(cloudPaymentsCharge).toHaveBeenCalledOnce();
    expect(plategaCharge).not.toHaveBeenCalled();
  });

  it('routes CRYPTO exclusively to Platega', async () => {
    plategaCharge.mockResolvedValueOnce({
      success: true,
      providerPaymentId: 'platega-crypto-1',
    });

    const adapter = new RussiaPaymentAdapter();

    const result = await adapter.charge({
      ...request,
      paymentMethod: 'CRYPTO',
    });

    expect(result.success).toBe(true);
    expect(plategaCharge).toHaveBeenCalledOnce();
    expect(yooKassaCharge).not.toHaveBeenCalled();
    expect(cloudPaymentsCharge).not.toHaveBeenCalled();
  });
});
