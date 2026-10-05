import type { FastifyRequest } from 'fastify';
import {
  adminPaymentOverview,
  createAdminProduct,
  createAdminProductPrice,
  deleteAdminProductPrice,
  updateAdminPayment,
  updateAdminProduct,
  updateAdminProductPrice,
} from './payment.service.js';

export async function adminPayments() {
  return adminPaymentOverview();
}

export async function createAdminProductController(request: FastifyRequest) {
  return createAdminProduct(request.body as any);
}

export async function updateAdminProductController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminProduct(request.params.id, request.body as any);
}

export async function updateAdminProductPriceController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminProductPrice(request.params.id, request.body as any);
}

export async function deleteAdminProductPriceController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return deleteAdminProductPrice(request.params.id);
}

export async function updateAdminPaymentController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminPayment(request.params.id, request.body as any);
}

export async function createAdminProductPriceController(request: FastifyRequest) {
  return createAdminProductPrice(request.body as any);
}
