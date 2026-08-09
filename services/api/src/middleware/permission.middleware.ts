import type { FastifyRequest, FastifyReply } from 'fastify';

import createError from 'http-errors';

import { prisma } from '../config/database.js';

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as {
      id?: string;
    };

    if (!user?.id) {
      throw createError(401, 'Authentication required');
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      throw createError(401, 'User not found');
    }

    const hasPermission = dbUser.role.permissions.some(
      (item) => item.permission.name === permission,
    );

    if (!hasPermission) {
      throw createError(403, 'Permission denied');
    }
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as {
      id?: string;
    };

    if (!user?.id) {
      throw createError(401, 'Authentication required');
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        role: true,
      },
    });

    if (!dbUser) {
      throw createError(401, 'User not found');
    }

    if (!roles.includes(dbUser.role.name)) {
      throw createError(403, 'Role denied');
    }
  };
}
