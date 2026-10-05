import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import {
  adminPayments,
  createAdminProductController,
  createAdminProductPriceController,
  deleteAdminProductPriceController,
  updateAdminPaymentController,
  updateAdminProductController,
  updateAdminProductPriceController,
  adminBillingTopologyController,
  updateAdminBillingTopologyController,
  adminFinancialReportController,
  createAdminFinancialExpenseController,
  deleteAdminFinancialExpenseController,
} from './payment.controller.js';

export default async function paymentAdminRoutes(app: FastifyInstance) {
  const guard = [authMiddleware, requireRole('ADMIN')];
  app.get('/payments', { preHandler: guard }, adminPayments);
  app.get('/billing-topology', { preHandler: guard }, adminBillingTopologyController);
  app.get('/financial-report', { preHandler: guard }, adminFinancialReportController);
  app.post('/financial-expenses', { preHandler: guard }, createAdminFinancialExpenseController);
  app.delete<{ Params: { id: string } }>(
    '/financial-expenses/:id',
    { preHandler: guard },
    deleteAdminFinancialExpenseController,
  );
  app.put('/billing-topology', { preHandler: guard }, updateAdminBillingTopologyController);
  app.post('/products', { preHandler: guard }, createAdminProductController);
  app.put<{ Params: { id: string } }>(
    '/products/:id',
    { preHandler: guard },
    updateAdminProductController,
  );
  app.post('/product-prices', { preHandler: guard }, createAdminProductPriceController);
  app.put<{ Params: { id: string } }>(
    '/product-prices/:id',
    { preHandler: guard },
    updateAdminProductPriceController,
  );
  app.delete<{ Params: { id: string } }>(
    '/product-prices/:id',
    { preHandler: guard },
    deleteAdminProductPriceController,
  );
  app.put<{ Params: { id: string } }>(
    '/payments/:id',
    { preHandler: guard },
    updateAdminPaymentController,
  );
}
