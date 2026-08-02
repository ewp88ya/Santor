import type { FastifyRequest, FastifyReply } from 'fastify';

import createError from 'http-errors';

import { verifyToken } from '../modules/auth/jwt.js';

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw createError(401, 'Missing authorization token');
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    throw createError(401, 'Invalid authorization format');
  }

  try {
    const payload = verifyToken(token);

    if (typeof payload === 'string' || !payload.id) {
      throw new Error('Invalid token payload');
    }

    request.user = {
      id: payload.id,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    throw createError(401, 'Invalid or expired token');
  }
}
