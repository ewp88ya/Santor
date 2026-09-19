import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import { env } from '../../config/env.js';
import { auditLog } from '../audit/audit.service.js';
import { telegramService, type TelegramUpdate } from './telegram.service.js';

export async function telegramWebhookController(request: FastifyRequest) {
  const secret = request.headers['x-telegram-bot-api-secret-token'];
  if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    await auditLog({
      action: 'telegram_webhook_auth_failed',
      resource: request.url,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { reason: 'invalid_webhook_secret' },
    });
    throw createError(401, 'Invalid Telegram webhook secret');
  }
  return { success: true, ...(await telegramService.handleUpdate(request.body as TelegramUpdate)) };
}

export async function telegramLinkController(request: FastifyRequest) {
  const user = request.user as { id?: string };
  if (!user?.id) throw createError(401, 'Invalid user token');

  const result = await telegramService.linkTelegramUser(user.id);
  await auditLog({
    userId: user.id,
    action: 'telegram_link_code_created',
    resource: 'telegram_identity',
    metadata: { expiresAt: result.expiresAt.toISOString() },
  });
  return { success: true, ...result };
}
