import type { FastifyRequest } from 'fastify';
import createError from 'http-errors';
import {
  getAdminOverview,
  getInfrastructureMonitoring,
  getSiteConfig,
  updateSiteConfig,
  getOperationalEvents,
  updateOperationalEvent,
} from './admin.service.js';

export async function adminOverview() {
  return getAdminOverview();
}

export async function adminInfrastructureMonitoring() {
  return getInfrastructureMonitoring();
}

export async function adminSiteConfig() {
  return getSiteConfig();
}

export async function updateAdminSiteConfig(request: FastifyRequest) {
  if (!request.body) throw createError(400, 'Request body required');
  return updateSiteConfig(request.body);
}

export async function adminOperationalEvents(request: FastifyRequest) {
  const query = request.query as { status?: string; category?: string };
  return getOperationalEvents(query);
}

export async function updateAdminOperationalEvent(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  return updateOperationalEvent(id, request.body);
}
