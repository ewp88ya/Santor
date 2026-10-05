import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  adminPayments,
  createAdminProductPriceController,
  updateAdminPaymentStatusController,
  updateAdminProductController,
} from './payment.controller.js';

export default async function paymentAdminRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/payments', { preHandler: guard }, adminPayments);
  app.put('/payments/:id/status', { preHandler: guard }, updateAdminPaymentStatusController);
  app.put('/products/:id', { preHandler: guard }, updateAdminProductController);
  app.post('/product-prices', { preHandler: guard }, createAdminProductPriceController);
}
