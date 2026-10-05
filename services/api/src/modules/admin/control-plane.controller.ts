import type { FastifyRequest } from 'fastify';
import { getAdminControlPlane, updateAdminControlPlane } from './control-plane.service.js';

export async function adminControlPlane() {
  return getAdminControlPlane();
}

export async function updateAdminControlPlaneController(request: FastifyRequest) {
  return updateAdminControlPlane(request.body);
}
