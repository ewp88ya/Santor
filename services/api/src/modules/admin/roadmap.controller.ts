import type { FastifyRequest } from 'fastify';
import { listRoadmap, updateRoadmapPhase } from './roadmap.service.js';

export async function adminRoadmap() {
  return listRoadmap();
}

export async function updateAdminRoadmapPhase(request: FastifyRequest<{ Params: { id: string } }>) {
  return updateRoadmapPhase(request.params.id, request.body);
}
