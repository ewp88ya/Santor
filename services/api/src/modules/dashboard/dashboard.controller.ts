import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import { getDashboard } from './dashboard.service.js';

export async function dashboard(request: FastifyRequest) {
  const user = request.user as {
    id?: string;
  };

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  return getDashboard(user.id);
}
