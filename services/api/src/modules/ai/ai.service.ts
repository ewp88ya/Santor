import { randomUUID } from 'node:crypto';

import createError from 'http-errors';

import { env } from '../../config/env.js';

export interface AiChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface LnNeuTaskResponse {
  status: string;
  message: string;
  task_id: string;
  queue_size: number;
}

interface LnNeuClientOptions {
  apiUrl?: string;
  apiKey?: string;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
}

export function createLnNeuClient(options: LnNeuClientOptions = {}) {
  const enabled = options.enabled ?? env.LN_NEU_ENABLED;
  const apiUrl = options.apiUrl ?? env.LN_NEU_API_URL;
  const apiKey = options.apiKey ?? env.LN_NEU_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRetries = options.maxRetries ?? 2;

  return {
    async executeChat(userId: string, request: AiChatRequest): Promise<LnNeuTaskResponse> {
      if (!enabled) {
        throw createError(503, 'LN-NeU integration is disabled');
      }

      const url = `${apiUrl.replace(/\/$/, '')}/execute`;
      const body = {
        taskId: randomUUID(),
        action: 'chat',
        input: request.message,
        context: {
          userId,
          ...(request.context ?? {}),
        },
      };

      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetchImpl(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-ln-neu-api-key': apiKey,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (response.ok) {
            return (await response.json()) as LnNeuTaskResponse;
          }

          if (![502, 503, 504].includes(response.status) || attempt === maxRetries) {
            throw createError(502, `LN-NeU returned HTTP ${response.status}`);
          }

          lastError = new Error(`LN-NeU returned HTTP ${response.status}`);
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries) {
            throw createError(502, 'LN-NeU integration unavailable');
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      throw createError(502, lastError instanceof Error ? lastError.message : 'LN-NeU integration unavailable');
    },
  };
}

export const lnNeuClient = createLnNeuClient();
