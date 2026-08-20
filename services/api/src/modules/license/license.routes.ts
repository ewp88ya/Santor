import type { FastifyInstance } from 'fastify';

import {
  detailLicenseController,
  listLicenseController,
  subscriptionLicenseController,
} from './license.controller.js';

export async function licenseRoutes(app: FastifyInstance) {
  app.get('/licenses', async () => {
    return listLicenseController();
  });

  app.get('/licenses/:id', async (request) => {
    const { id } = request.params as {
      id: string;
    };

    return detailLicenseController(id);
  });

  app.get('/subscriptions/:id/license', async (request) => {
    const { id } = request.params as {
      id: string;
    };

    return subscriptionLicenseController(id);
  });
}
