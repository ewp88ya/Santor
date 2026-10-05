import type { FastifyRequest } from 'fastify';
import { createAd, deleteAd, listAds, publishAd, unpublishAd, updateAd } from './ads.service.js';

export async function adminAds() {
  return listAds();
}

export async function createAdminAd(request: FastifyRequest) {
  return createAd(request.body);
}

export async function updateAdminAd(request: FastifyRequest<{ Params: { id: string } }>) {
  return updateAd(request.params.id, request.body);
}

export async function deleteAdminAd(request: FastifyRequest<{ Params: { id: string } }>) {
  return deleteAd(request.params.id);
}

export async function publishAdminAd(request: FastifyRequest<{ Params: { id: string } }>) {
  return publishAd(request.params.id);
}

export async function unpublishAdminAd(request: FastifyRequest<{ Params: { id: string } }>) {
  return unpublishAd(request.params.id);
}
