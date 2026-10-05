import type { FastifyRequest } from 'fastify';
import {
  adminPaymentOverview,
  createAdminProductPrice,
  updateAdminProduct,
} from './payment.service.js';

export async function adminPayments() {
  return adminPaymentOverview();
}

export async function updateAdminProductController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminProduct(request.params.id, request.body as any);
}

export async function createAdminProductPriceController(request: FastifyRequest) {
  return createAdminProductPrice(request.body as any);
}
