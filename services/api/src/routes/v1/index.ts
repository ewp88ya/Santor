import type { FastifyInstance } from 'fastify';

import healthRoute from './health.js';
import productRoutes from '../../modules/product/product.routes.js';
import subscriptionRoutes from '../../modules/subscription/subscription.routes.js';

import paymentRoutes from '../../modules/payment/payment.routes.js';
import { licenseRoutes } from "../../modules/license/license.routes.js";

export default async function v1Routes(app: FastifyInstance) {
  await app.register(healthRoute);

  await app.register(productRoutes);

  await app.register(subscriptionRoutes);

  await app.register(paymentRoutes);

  await app.register(licenseRoutes);
}
