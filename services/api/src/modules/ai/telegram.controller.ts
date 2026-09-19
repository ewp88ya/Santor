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

  const update = request.body as TelegramUpdate;
  const result = await telegramService.handleUpdate(update);

  return { success: true, ...result };
}
