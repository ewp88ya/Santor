import type { FastifyInstance } from 'fastify';

import {
  createPaymentController,
  detailPaymentController,
  listPaymentController,
  paymentSuccessController,
} from './payment.controller.js';

export default async function paymentRoutes(app: FastifyInstance) {
  app.get('/payments', async () => {
    return listPaymentController();
  });

  app.get('/payments/:id', async (request) => {
    const { id } = request.params as {
      id: string;
    };

    return detailPaymentController(id);
  });

  app.post('/payments', async (request) => {
    return createPaymentController(
      request.body as {
        subscriptionId: string;
        provider: string;
        amount: number;
        currency: string;
      },
    );
  });

  app.patch('/payments/:id/success', async (request) => {
    const { id } = request.params as {
      id: string;
    };

    return paymentSuccessController(
      id,
      request.body as {
        transactionId: string;
      },
    );
  });
}
