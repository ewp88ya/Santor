import type { FastifyRequest } from 'fastify';
import createError from 'http-errors';

import { getProxyProfile, revokeProxyProfile } from './proxy.service.js';

function userId(request: FastifyRequest) {
  const user = request.user as { id?: string };
  if (!user?.id) throw createError(401, 'Invalid user token');
  return user.id;
}

function deviceId(request: FastifyRequest) {
  const params = request.params as { id?: string };
  if (!params?.id) throw createError(400, 'Device id is required');
  return params.id;
}

export async function proxyProfileController(request: FastifyRequest) {
  return getProxyProfile(userId(request), deviceId(request));
}

export async function revokeProxyController(request: FastifyRequest) {
  return revokeProxyProfile(userId(request), deviceId(request));
}
