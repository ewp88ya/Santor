import { afterEach, describe, expect, it, vi } from 'vitest';

import { executeAiTask } from './ai.service.js';

const task = {
  taskId: 'test-task-1',
  action: 'chat',
  input: 'hello',
  context: { source: 'test' },
};

describe('LN-NeU AI service client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the authenticated execute contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ result: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      executeAiTask(task, {
        baseUrl: 'http://ln-neu:8000/',
        apiKey: 'a'.repeat(32),
        retries: 0,
      }),
    ).resolves.toEqual({ result: 'ok' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ln-neu:8000/execute');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      'X-LN-NeU-API-Key': 'a'.repeat(32),
    });
    expect(JSON.parse(String(init?.body))).toEqual(task);
  });

  it('returns upstream authentication failures without retrying', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('unauthorized', { status: 401 }));

    await expect(
      executeAiTask(task, {
        baseUrl: 'http://ln-neu:8000',
        apiKey: 'a'.repeat(32),
        retries: 2,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient upstream failures', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await expect(
      executeAiTask(task, {
        baseUrl: 'http://ln-neu:8000',
        apiKey: 'a'.repeat(32),
        retries: 1,
      }),
    ).resolves.toEqual({ result: 'ok' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps transport timeout to 504', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );

    await expect(
      executeAiTask(task, {
        baseUrl: 'http://ln-neu:8000',
        apiKey: 'a'.repeat(32),
        retries: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 504 });
  });
});
