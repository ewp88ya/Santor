import { createHash, randomBytes } from 'node:crypto';

import createError from 'http-errors';

import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { lnNeuClient } from './ai.service.js';

const LINK_TTL_MS = 10 * 60 * 1000;

function hashLinkCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

interface TelegramApiResponse { ok: boolean; result?: unknown; }

interface TelegramServiceOptions {
  botToken?: string;
  fetchImpl?: typeof fetch;
  executeChat?: typeof lnNeuClient.executeChat;
}

export function createTelegramService(options: TelegramServiceOptions = {}) {
  const botToken = options.botToken ?? env.TELEGRAM_BOT_TOKEN;
  const fetchImpl = options.fetchImpl ?? fetch;
  const executeChat = options.executeChat ?? lnNeuClient.executeChat;

  async function sendMessage(chatId: number, text: string) {
    if (!botToken) throw createError(503, 'Telegram bot integration is disabled');
    const response = await fetchImpl('https://api.telegram.org/bot' + botToken + '/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
    if (!response.ok || !payload?.ok) throw createError(502, 'Telegram API request failed');
    return payload;
  }

  async function linkTelegramUser(userId: string) {
    const code = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    const existing = await prisma.telegramIdentity.findUnique({ where: { userId } });

    if (existing) {
      await prisma.telegramIdentity.update({
        where: { userId },
        data: { linkCodeHash: hashLinkCode(code), linkCodeExpiresAt: expiresAt },
      });
    } else {
      await prisma.telegramIdentity.create({
        data: {
          userId,
          telegramUserId: 'pending:' + userId,
          linkCodeHash: hashLinkCode(code),
          linkCodeExpiresAt: expiresAt,
        },
      });
    }

    return {
      code,
      expiresAt,
      deepLink: env.TELEGRAM_BOT_USERNAME
        ? 'https://t.me/' + env.TELEGRAM_BOT_USERNAME + '?start=link_' + code
        : undefined,
    };
  }

  async function consumeLinkCode(code: string, telegramUserId: string, username?: string, firstName?: string) {
    const identity = await prisma.telegramIdentity.findFirst({
      where: { linkCodeHash: hashLinkCode(code), linkCodeExpiresAt: { gt: new Date() } },
    });
    if (!identity) throw createError(400, 'Invalid or expired Telegram link code');

    const telegramOwner = await prisma.telegramIdentity.findFirst({
      where: { telegramUserId, NOT: { id: identity.id } },
    });
    if (telegramOwner) throw createError(409, 'Telegram account is already linked to another Santor account');

    return prisma.telegramIdentity.update({
      where: { id: identity.id },
      data: {
        telegramUserId,
        username,
        firstName,
        linkedAt: new Date(),
        linkCodeHash: null,
        linkCodeExpiresAt: null,
      },
    });
  }

  async function handleUpdate(update: TelegramUpdate) {
    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat.id;
    const telegramUserId = message?.from?.id;
    if (!message || !text || chatId === undefined || telegramUserId === undefined) return { handled: false };

    if (text.startsWith('/start link_')) {
      await consumeLinkCode(text.slice('/start link_'.length).trim(), String(telegramUserId), message.from?.username, message.from?.first_name);
      await sendMessage(chatId, 'Telegram berhasil terhubung ke akun Santor Anda.');
      return { handled: true, type: 'link' };
    }

    if (text === '/start' || text === '/help') {
      await sendMessage(chatId, 'Santor Bot\n\nUse /chat <message> to talk to Santor AI.\nYou can also send a normal message directly.\nUse /help to show this message.');
      return { handled: true, type: 'help' };
    }

    const chatMessage = text.startsWith('/chat ') ? text.slice(6).trim() : text;
    if (!chatMessage) {
      await sendMessage(chatId, 'Use /chat <message> to send a message to Santor AI.');
      return { handled: true, type: 'prompt' };
    }

    const identity = await prisma.telegramIdentity.findUnique({
      where: { telegramUserId: String(telegramUserId) },
      select: { userId: true },
    });
    if (!identity) {
      await sendMessage(chatId, 'Akun Telegram belum terhubung. Hubungkan Telegram dari Dashboard Santor terlebih dahulu.');
      return { handled: true, type: 'unlinked' };
    }

    const result = await executeChat(identity.userId, {
      message: chatMessage,
      context: { source: 'telegram', telegramUserId, telegramChatId: chatId, telegramUsername: message.from?.username },
    });
    await sendMessage(chatId, result.message || 'Your AI task was accepted.');
    return { handled: true, type: 'chat', taskId: result.task_id };
  }

  return { handleUpdate, sendMessage, linkTelegramUser, consumeLinkCode };
}

export const telegramService = createTelegramService();
