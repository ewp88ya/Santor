import type { FastifyReply, FastifyRequest } from 'fastify';

import createError from 'http-errors';

import { env } from '../config/env.js';
import { auditLog } from '../modules/audit/audit.service.js';

type ExternalClient = {
  key: string;
  scopes: string[];
};

function loadClients(): ExternalClient[] {
  const raw = process.env.SANTOR_EXTERNAL_API_KEYS?.trim() ?? '';
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).flatMap(([key, scopes]) =>
      typeof scopes === 'string'
        ? [{ key, scopes: scopes.split(',').map((scope) => scope.trim()).filter(Boolean) }]
        : Array.isArray(scopes) && scopes.every((scope) => typeof scope === 'string')
          ? [{ key, scopes: scopes as string[] }]
          : [],
    );
  } catch {
    throw new Error('SANTOR_EXTERNAL_API_KEYS must be valid JSON');
  }
}

export function externalAuth(requiredScope: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const providedKey = request.headers['x-santor-api-key'];
    const key = typeof providedKey === 'string' ? providedKey : '';
    const client = loadClients().find((item) => item.key === key);

    if (!client) {
      await auditLog({
        action: 'external_auth_failed',
        resource: request.routerPath ?? request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { reason: 'invalid_api_key' },
      });
      throw createError(401, 'Invalid external client credentials');
    }

    if (!client.scopes.includes(requiredScope)) {
      await auditLog({
        action: 'external_scope_denied',
        resource: request.routerPath ?? request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { scope: requiredScope },
      });
      throw createError(403, 'External client scope denied');
    }

    request.externalClient = {
      scopes: client.scopes,
    };

    await auditLog({
      action: 'external_api_request',
      resource: request.routerPath ?? request.url,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        scope: requiredScope,
        clientId: request.headers['x-santor-client-id'] ?? 'unknown',
      },
    });

    if (env.NODE_ENV === 'production' && key.length < 32) {
      throw createError(401, 'Invalid external client credentials');
    }
  };
}
