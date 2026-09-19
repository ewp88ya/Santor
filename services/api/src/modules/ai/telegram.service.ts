import createError from "http-errors";

import { env } from "../../config/env.js";
import { lnNeuClient } from "./ai.service.js";

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
}

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
    if (!botToken) {
      throw createError(503, "Telegram bot integration is disabled");
    }

    const response = await fetchImpl(
      "https://api.telegram.org/bot" + botToken + "/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as TelegramApiResponse | null;
    if (!response.ok || !payload?.ok) {
      throw createError(502, "Telegram API request failed");
    }

    return payload;
  }

  async function handleUpdate(update: TelegramUpdate) {
    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat.id;
    const telegramUserId = message?.from?.id;

    if (
      !message ||
      !text ||
      chatId === undefined ||
      telegramUserId === undefined
    ) {
      return { handled: false };
    }

    if (text === "/start" || text === "/help") {
      await sendMessage(
        chatId,
        "Santor Bot\n\nUse /chat <message> to talk to Santor AI.\nYou can also send a normal message directly.\nUse /help to show this message.",
      );
      return { handled: true, type: "help" };
    }

    const chatMessage = text.startsWith("/chat ") ? text.slice(6).trim() : text;
    if (!chatMessage) {
      await sendMessage(
        chatId,
        "Use /chat <message> to send a message to Santor AI.",
      );
      return { handled: true, type: "prompt" };
    }

    const result = await executeChat("telegram:" + telegramUserId, {
      message: chatMessage,
      context: {
        source: "telegram",
        telegramUserId,
        telegramChatId: chatId,
        telegramUsername: message.from?.username,
      },
    });

    await sendMessage(chatId, result.message || "Your AI task was accepted.");
    return { handled: true, type: "chat", taskId: result.task_id };
  }

  return { handleUpdate, sendMessage };
}

export const telegramService = createTelegramService();
