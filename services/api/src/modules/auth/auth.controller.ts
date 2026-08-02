import type { FastifyRequest } from 'fastify';

import { login, register } from './auth.service.js';

export async function registerController(
  request: FastifyRequest<{
    Body: {
      email: string;
      password: string;
      name?: string;
    };
  }>,
) {
  const { email, password, name } = request.body;

  return register(email, password, name);
}

export async function loginController(
  request: FastifyRequest<{
    Body: {
      email: string;
      password: string;
    };
  }>,
) {
  const { email, password } = request.body;

  return login(email, password);
}
