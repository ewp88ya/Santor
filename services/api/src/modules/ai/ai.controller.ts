import type { FastifyRequest } from 'fastify';

import createError from 'http-errors';

import { lnNeuClient } from './ai.service.js';

interface AiChatBody {
  message: string;
  context?: Record<string, unknown>;
}

export async function aiChatController(request: FastifyRequest) {
  const user = request.user as { id?: string };
  const body = request.body as AiChatBody;

  if (!user?.id) {
    throw createError(401, 'Invalid user token');
  }

  const result = await lnNeuClient.executeChat(user.id, body);

  return {
    success: true,
    taskId: result.task_id,
    status: result.status,
    message: result.message,
  };
}
