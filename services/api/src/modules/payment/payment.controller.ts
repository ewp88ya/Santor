import {
  createNewPayment,
  getPayment,
  getPayments,
  markPaymentSuccess,
} from './payment.service.js';

export async function createPaymentController(body: {
  subscriptionId: string;
  provider: string;
  amount: number;
  currency: string;
}) {
  return createNewPayment({
    subscriptionId: body.subscriptionId,
    provider: body.provider,
    amount: body.amount,
    currency: body.currency,
  });
}

export async function listPaymentController() {
  return getPayments();
}

export async function detailPaymentController(id: string) {
  return getPayment(id);
}

export async function paymentSuccessController(
  id: string,
  body: {
    transactionId: string;
  },
) {
  return markPaymentSuccess(id, body.transactionId);
}
