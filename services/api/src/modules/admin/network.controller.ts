import type { FastifyRequest } from 'fastify';
import {
  createBypassRule,
  createClientProfile,
  createTunnel,
  deleteNetworkItem,
  networkOverview,
  updateBypassRule,
  updateClientProfile,
  updateTunnel,
} from './network.service.js';

export async function adminNetwork() {
  return networkOverview();
}
export async function createAdminTunnel(request: FastifyRequest) {
  return createTunnel(request.body);
}
export async function updateAdminTunnel(request: FastifyRequest<{ Params: { id: string } }>) {
  return updateTunnel(request.params.id, request.body);
}
export async function createAdminClient(request: FastifyRequest) {
  return createClientProfile(request.body);
}
export async function updateAdminClient(request: FastifyRequest<{ Params: { id: string } }>) {
  return updateClientProfile(request.params.id, request.body);
}
export async function createAdminBypass(request: FastifyRequest) {
  return createBypassRule(request.body);
}
export async function updateAdminBypass(request: FastifyRequest<{ Params: { id: string } }>) {
  return updateBypassRule(request.params.id, request.body);
}
export async function deleteAdminNetworkItem(
  request: FastifyRequest<{ Params: { type: string; id: string } }>,
) {
  return deleteNetworkItem(request.params.type, request.params.id);
}
