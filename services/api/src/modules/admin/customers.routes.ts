import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  listAdminCustomers,
  updateAdminCustomerController,
  updateAdminSubscriptionController,
} from './customers.controller.js';

export default async function customerAdminRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/customers', { preHandler: guard }, listAdminCustomers);
  app.put<{ Params: { id: string } }>('/customers/:id', { preHandler: guard }, updateAdminCustomerController);
  app.put<{ Params: { id: string } }>(
    '/subscriptions/:id',
    { preHandler: guard },
    updateAdminSubscriptionController,
  );
}
