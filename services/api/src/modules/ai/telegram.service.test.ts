import { describe, expect, it, vi } from 'vitest';

import { createTelegramService } from './telegram.service.js';

describe('Telegram service', () => {
  it('handles /help without calling LN-NeU', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 }),
    );
    const executeChat = vi.fn();
    const service = createTelegramService({
      botToken: 'bot-token',
      fetchImpl,
      executeChat,
    });

    const result = await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 100, type: 'private' },
        from: { id: 200 },
        text: '/help',
      },
    });

    expect(result.type).toBe('help');
    expect(executeChat).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('routes chat to LN-NeU and sends the accepted task message to Telegram', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 }),
    );
    const executeChat = vi.fn().mockResolvedValue({
      status: 'queued',
      message: 'Task successfully queued',
      task_id: 'task-telegram-1',
      queue_size: 1,
    });
    const service = createTelegramService({
      botToken: 'bot-token',
      fetchImpl,
      executeChat,
    });

    const result = await service.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        chat: { id: 101, type: 'private' },
        from: { id: 201, username: 'alice' },
        text: '/chat hello Santor',
      },
    });

    expect(result.type).toBe('chat');
    expect(executeChat).toHaveBeenCalledWith(
      'telegram:201',
      expect.objectContaining({
        message: 'hello Santor',
        context: expect.objectContaining({
          source: 'telegram',
          telegramUserId: 201,
          telegramChatId: 101,
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
