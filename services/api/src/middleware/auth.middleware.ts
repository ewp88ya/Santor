import type { FastifyRequest, FastifyReply } from 'fastify';

import createError from 'http-errors';

import { prisma } from '../config/database.js';
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

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw createError(401, 'User not found or inactive');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role?.name,
      permissions: user.role?.permissions.map((item) => item.permission.name) ?? [],
    };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    throw createError(401, 'Invalid or expired token');
  }
}
