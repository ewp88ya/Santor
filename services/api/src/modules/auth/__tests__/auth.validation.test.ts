import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { loginBodySchema, registerBodySchema } from '../auth.schema.js';

function createValidationApp() {
  const app = Fastify();

  app.post('/register', { schema: registerBodySchema }, async () => ({ success: true }));
  app.post('/login', { schema: loginBodySchema }, async () => ({ success: true }));

  return app;
}

describe('Phase 12 — auth input validation', () => {
  it('accepts a valid register payload', async () => {
    const app = createValidationApp();

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
      },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('rejects invalid register payloads', async () => {
    const app = createValidationApp();

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        email: 'not-an-email',
        password: 'short',
        unexpected: true,
      },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects invalid login payloads', async () => {
    const app = createValidationApp();

    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email: 'not-an-email',
        password: 'short',
        unexpected: true,
      },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects missing required authentication fields', async () => {
    const app = createValidationApp();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/register',
      payload: { email: 'user@example.com' },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/login',
      payload: { password: 'password123' },
    });

    expect(registerResponse.statusCode).toBe(400);
    expect(loginResponse.statusCode).toBe(400);
    await app.close();
  });
});
