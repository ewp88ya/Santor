import createError from 'http-errors';

import { env } from '../../config/env.js';

export interface AiTask {
  taskId: string;
  action: string;
  input: unknown;
  context?: Record<string, unknown>;
}

export interface AiClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

export async function executeAiTask(task: AiTask, options: AiClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? env.LN_NEU_BASE_URL);
  const apiKey = options.apiKey ?? env.SANTOR_API_KEY;
  const timeoutMs = options.timeoutMs ?? env.LN_NEU_TIMEOUT_MS;
  const retries = options.retries ?? env.LN_NEU_RETRIES;

  if (!baseUrl) throw createError(503, 'LN-NeU service is not configured');
  if (!apiKey) throw createError(503, 'LN-NeU API key is not configured');

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LN-NeU-API-Key': apiKey,
        },
        body: JSON.stringify(task),
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as unknown;

      const body = await response.text();
      const error = createError(
        response.status,
        body || `LN-NeU request failed with status ${response.status}`,
      );

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < retries) {
        lastError = error;
        continue;
      }

      throw error;
    } catch (error) {
      if (error === lastError) continue;
      lastError = error;

      if (attempt === retries) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw createError(504, 'LN-NeU request timed out');
        }
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? createError(502, 'LN-NeU request failed');
}
