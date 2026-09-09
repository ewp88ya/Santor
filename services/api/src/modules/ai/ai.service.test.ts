import { describe, expect, it, vi } from 'vitest';

import { createLnNeuClient } from './ai.service.js';

describe('LN-NeU client', () => {
  it('rejects when integration is disabled', async () => {
    const client = createLnNeuClient({ enabled: false });

    await expect(client.executeChat('user-1', { message: 'hello' })).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('sends the authenticated execute contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'queued',
          message: 'Task successfully queued',
          task_id: 'task-1',
          queue_size: 1,
        }),
        { status: 200 },
      ),
    );

    const client = createLnNeuClient({
      enabled: true,
      apiUrl: 'http://ln-neu:8000/',
      apiKey: 'x'.repeat(32),
      fetchImpl,
    });

    const result = await client.executeChat('user-1', {
      message: 'hello',
      context: { source: 'dashboard', userId: 'spoofed-user' },
    });

    expect(result.status).toBe('queued');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://ln-neu:8000/execute');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      'x-ln-neu-api-key': 'x'.repeat(32),
    });

    const body = JSON.parse(String(init?.body));
    expect(body.action).toBe('chat');
    expect(body.input).toBe('hello');
    expect(body.context).toMatchObject({ userId: 'user-1', source: 'dashboard' });
    expect(body.taskId).toEqual(expect.any(String));
  });

  it('retries transient upstream failures', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'queued',
            message: 'Task successfully queued',
            task_id: 'task-2',
            queue_size: 2,
          }),
          { status: 200 },
        ),
      );

    const client = createLnNeuClient({
      enabled: true,
      apiUrl: 'http://ln-neu:8000',
      apiKey: 'y'.repeat(32),
      fetchImpl,
      maxRetries: 2,
    });

    const result = await client.executeChat('user-2', { message: 'retry me' });

    expect(result.task_id).toBe('task-2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient upstream failures', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));

    const client = createLnNeuClient({
      enabled: true,
      apiUrl: 'http://ln-neu:8000',
      apiKey: 'z'.repeat(32),
      fetchImpl,
      maxRetries: 2,
    });

    await expect(client.executeChat('user-3', { message: 'unauthorized' })).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
