import type { FastifyRequest } from 'fastify';
import {
  adminCustomers,
  updateAdminCustomer,
  updateAdminSubscription,
} from './customers.service.js';

export async function listAdminCustomers() {
  return adminCustomers();
}

export async function updateAdminCustomerController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminCustomer(request.params.id, request.body);
}

export async function updateAdminSubscriptionController(
  request: FastifyRequest<{ Params: { id: string } }>,
) {
  return updateAdminSubscription(request.params.id, request.body);
}
